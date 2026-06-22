import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { User } from './user.schema';
import { Review } from '../reviews/schemas/review.schema';
import { Property } from '../properties/schemas/property.schema';
import { Subscription } from '../subscriptions/schemas/subscription.schema';
import * as bcrypt from 'bcrypt';
import { Role } from '../auth/roles.enum';
import { ActivityLogsService } from '../activitylogs/activitylogs.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Review.name) private reviewModel: Model<Review>,
    @InjectModel(Property.name) private propertyModel: Model<Property>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<Subscription>,
    @InjectConnection() private connection: Connection,
    private readonly activityLogsService: ActivityLogsService,
  
  ) {}

  create(data: any) {
    return this.userModel.create(data);
  }

  findByEmail(email: string) {
    return this.userModel.findOne({ email });
  }

   async findAll(query: any) {
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 10, 100);
      const skip = (page - 1) * limit;

      const filters = { ...query };

      if (filters.isEnable !== undefined) {
          filters.isEnabled = filters.isEnable;
          delete filters.isEnable;
        }

      Object.keys(filters).forEach((key) => {
        if (filters[key] === 'true') {
          filters[key] = true;
        } else if (filters[key] === 'false') {
          filters[key] = false;
        }
      });

      if (filters.parentId) {
        filters.parentId = new Types.ObjectId(filters.parentId);
      }

      

      const orderbyParam = filters.orderby;
      const hasPropertyParam = filters.hasProperty;

      delete filters.page;
      delete filters.limit;
      delete filters.orderby;
      delete filters.hasProperty;

      const orderByReg: Record<string, any> = {};
      if (orderbyParam) {
        const orderbyArray = Array.isArray(orderbyParam) ? orderbyParam : [orderbyParam];
        orderbyArray.forEach((e) => {
          let [attrEntry, orderEntry] = e.split(':');
          orderByReg[attrEntry] = orderEntry && orderEntry.toLowerCase() === 'asc' ? 1 : -1;
        });
      } else {
        orderByReg['createAt'] = -1;
      }

      const pipeline: any[] = [];

      if (Object.keys(filters).length > 0) {
        pipeline.push({ $match: filters });
      }
      /*
      if (hasPropertyParam) {
        const statusProperties = ['published', 'pre-published', 'draft', 'trash', 'disabled'];
        const targetStatusProperty = hasPropertyParam.toString().toLowerCase();

        if (statusProperties.includes(targetStatusProperty)) {
          pipeline.push(
            {
              $lookup: {
                from: 'properties', 
                let: { userIdStr: { $toString: '$_id' }, userIdObj: '$_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ['$status', targetStatusProperty] },
                          {
                            $or: [
                              { $eq: ['$userId', '$$userIdObj'] },
                              { $eq: ['$userId', '$$userIdStr'] },
                              { $in: ['$$userIdStr', { $ifNull: ['$agents', []] }] }
                            ]
                          }
                        ]
                      }
                    }
                  },
                  { $limit: 1 },
                  { $project: { _id: 1 } }
                ],
                as: 'matchedProperties'
              }
            },
            { $match: { 'matchedProperties.0': { $exists: true } } }
          );
        }
      }
      */
      if (hasPropertyParam) {
        const statusProperties = ['published', 'pre-published', 'draft', 'trash', 'disabled'];
        const targetStatusProperty = hasPropertyParam.toString().toLowerCase();

        if (statusProperties.includes(targetStatusProperty)) {
          pipeline.push(
            
            {
              $lookup: {
                from: 'users', 
                localField: '_id',
                foreignField: 'parentId',
                as: 'subUsers'
              }
            },
            
            {
              $lookup: {
                from: 'properties', 
                let: { 
                  
                  allowedUserIdsObj: { 
                    $concatArrays: [['$_id'], { $ifNull: ['$subUsers._id', []] }] 
                  },
                  
                  allowedUserIdsStr: {
                    $map: {
                      input: { $concatArrays: [['$_id'], { $ifNull: ['$subUsers._id', []] }] },
                      as: 'uid',
                      in: { $toString: '$$uid' }
                    }
                  }
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ['$status', targetStatusProperty] },
                          {
                            $or: [
                              
                              { $in: ['$userId', '$$allowedUserIdsObj'] },
                              { $in: ['$userId', '$$allowedUserIdsStr'] },
                              {
                                $gt: [
                                  { $size: { $setIntersection: ['$$allowedUserIdsStr', { $ifNull: ['$agents', []] }] } },
                                  0
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    }
                  },
                  { $limit: 1 },
                  { $project: { _id: 1 } }
                ],
                as: 'matchedProperties'
              }
            },
            { $match: { 'matchedProperties.0': { $exists: true } } },
            { $project: { subUsers: 0 } }
          );
        }
      }

      pipeline.push({
        $facet: {
          totalCount: [{ $count: 'count' }],
          data: [
            { $sort: orderByReg },
            { $skip: skip },
            { $limit: limit }
          ]
        }
      });

      const [result] = await this.userModel.aggregate(pipeline).exec();

      const total =  result?.totalCount?.[0]?.count || 0;
      const data = result?.data || [];

      return {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        data,
      };
    }
  
  async findById(id: string) {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  // async updateById(id: string, data: Partial<User>) {
  //   const user = await this.userModel.findByIdAndUpdate(id, data, {
  //     new: true,
  //     runValidators: true,
  //   });

  //   if (!user) throw new NotFoundException('Usuario no encontrado');
  //   return user;
  // }
  async updateById(id: string, data: Partial<User>) {

    if (data.email) {
      const emailExists = await this.userModel.findOne({
        email: data.email,
        _id: { $ne: id },
      });

      if (emailExists) {
        throw new BadRequestException('El correo ya está en uso');
      }
    }


    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    const user = await this.userModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async addRole(userId: string, role: Role) {
    const user = await this.userModel.findById(userId);

    if (!user) return;

    if (!user.roles) {
      user.roles = [];
    }

    // evitar duplicados
    if (!user.roles.includes(role)) {
      user.roles.push(role);
    }

    await user.save();
  }

  async removeRole(userId: string, role: Role) {
    await this.userModel.updateOne(
      { _id: userId },
      { $pull: { roles: role } },
    );
  }
  
  async toggleFavorite(userId: string, propertyId: string) {

    const user = await this.userModel.findById(userId);

    if (!user) throw new NotFoundException('Usuario no encontrado');

    const isFavorite = user.favorites?.some(
      fav => fav.toString() === propertyId
    );

    if (isFavorite) {
      await this.userModel.findByIdAndUpdate(userId, {
        $pull: { favorites: propertyId },
      });
    } else {
      await this.userModel.findByIdAndUpdate(userId, {
        $addToSet: { favorites: propertyId },
      });
    }

    return { favorite: !isFavorite };
  }

  async incrementClicks(userId: string) {
    await this.activityLogsService.create({
      type: 'user',
      userId: userId.toString(),
      action: 'click',
    });

    return this.userModel.findByIdAndUpdate(
      userId,
      { $inc: { clickCounter: 1 } },
      { new: true }
    );
  }

  async incrementClicksWs(userId: string) {

    await this.activityLogsService.create({
      type: 'user',
      userId: userId.toString(),
      action: 'click-ws',
    });
    return this.userModel.findByIdAndUpdate(
      userId,
      { $inc: { clickCounterWs: 1 } },
      { new: true }
    );
  }

  async deleteUser(userId: string) {

      await this.reviewModel.deleteMany({ userId });
      await this.propertyModel.deleteMany({ userId: userId });
      await this.subscriptionModel.deleteMany({ userId });
      await this.userModel.findByIdAndDelete(userId);
      return { message: 'Usuario eliminado correctamente' };
    
  }

  async saveEasyBrokerKey(
    userId: string,
    apiKey: string,
  ) {
    const user = await this.userModel.findById(
      userId,
    );

    if (!user) {
      throw new BadRequestException(
        'Usuario no encontrado',
      );
    }

    user.easyBrokerApiKey = apiKey;
    user.easyBrokerEnabled = true;

    await user.save();

    return {
      message:
        'API KEY de EasyBroker guardada correctamente',
    };
  }

  
}