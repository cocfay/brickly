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
  private readonly reservedProfileSlugs = new Set([
    'add',
    'admin',
    'agencia',
    'agencias',
    'agente',
    'agentes',
    'api',
    'arquitecto',
    'arquitectos',
    'cpanel',
    'edit',
    'easybroker',
    'favorites',
    'home',
    'list-user',
    'list-user-me',
    'login',
    'me',
    'perfil',
    'profile',
    'propiedad',
    'propiedades',
    'registro',
    'users',
  ]);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Review.name) private reviewModel: Model<Review>,
    @InjectModel(Property.name) private propertyModel: Model<Property>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<Subscription>,
    @InjectConnection() private connection: Connection,
    private readonly activityLogsService: ActivityLogsService,
  
  ) {}

  async create(data: any) {
    const slugSource = data.profileSlug || this.getProfileSlugSource(data);
    const profileSlug = await this.ensureUniqueProfileSlug(slugSource);
    return this.userModel.create({ ...data, profileSlug });
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
        if (key === 'featured_user') {
          if (filters[key] === 'true' || filters[key] === true) {
            filters[key] = { $gt: 0 };
          } else if (filters[key] === 'false' || filters[key] === false) {
            filters[key] = { $in: [0, null] };
          } else {
            const numericValue = Number(filters[key]);
            if (!Number.isNaN(numericValue)) {
              filters[key] = numericValue;
            }
          }
          return;
        }

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
    return this.ensureProfileSlugForUser(user);
  }

  async findByProfileSlug(slug: string) {
    const normalizedSlug = this.normalizeProfileSlug(slug);
    let user = await this.userModel.findOne({ profileSlug: normalizedSlug });

    if (!user && this.isObjectId(slug)) {
      user = await this.userModel.findById(slug);
    }

    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.ensureProfileSlugForUser(user);
  }

  async findAgenciesForVerification() {
    const agencies = await this.userModel
      .find(
        {
          roles: Role.AGENCIA,
          isEnabled: true,
        },
        {
          name: 1,
          username: 1,
          phone: 1,
          avatar: 1,
          roles: 1,
          isEnabled: 1,
          agentInfo: 1,
          parentId: 1,
        },
      )
      .lean();

    const completeAgencies = agencies.filter((agency: any) =>
      this.isVerificationProfileComplete(agency),
    );

    if (completeAgencies.length === 0) {
      return {
        total: 0,
        data: [],
      };
    }

    const agencyIds = completeAgencies.map((agency: any) => agency._id);
    const agencyIdSet = new Set(agencyIds.map((id: any) => id.toString()));

    const children = await this.userModel
      .find(
        {
          parentId: { $in: agencyIds },
          isEnabled: true,
        },
        {
          name: 1,
          username: 1,
          phone: 1,
          avatar: 1,
          roles: 1,
          isEnabled: 1,
          agentInfo: 1,
          parentId: 1,
        },
      )
      .lean();

    const childrenByAgency = new Map<string, any[]>();
    const verifiableChildrenByAgency = new Map<string, any[]>();
    const candidateUserIds = new Map<string, any>();

    completeAgencies.forEach((agency: any) => {
      candidateUserIds.set(agency._id.toString(), agency._id);
      childrenByAgency.set(agency._id.toString(), []);
      verifiableChildrenByAgency.set(agency._id.toString(), []);
    });

    children.forEach((child: any) => {
      const parentId = child.parentId?.toString();
      if (!parentId || !agencyIdSet.has(parentId)) return;

      candidateUserIds.set(child._id.toString(), child._id);
      childrenByAgency.get(parentId)?.push(child);

      const roles = this.getRolesArray(child);
      if (
        roles.includes(Role.AGENTE) &&
        this.isVerificationProfileComplete(child)
      ) {
        verifiableChildrenByAgency.get(parentId)?.push(child);
      }
    });

    const candidateIds = Array.from(candidateUserIds.values());
    const candidateIdStrings = Array.from(candidateUserIds.keys());
    const propertyOwners = new Set<string>();

    const publishedProperties = await this.propertyModel
      .aggregate([
        {
          $match: {
            status: 'published',
            $or: [
              { userId: { $in: candidateIds } },
              { userId: { $in: candidateIdStrings } },
              { agents: { $in: candidateIds } },
              { agents: { $in: candidateIdStrings } },
            ],
          },
        },
        {
          $project: {
            userId: 1,
            agents: 1,
          },
        },
      ])
      .exec();

    publishedProperties.forEach((property: any) => {
      const userId = property.userId?.toString();
      if (userId && candidateUserIds.has(userId)) {
        propertyOwners.add(userId);
      }

      if (Array.isArray(property.agents)) {
        property.agents.forEach((agentId: any) => {
          const agentIdString = agentId?.toString();
          if (agentIdString && candidateUserIds.has(agentIdString)) {
            propertyOwners.add(agentIdString);
          }
        });
      }
    });

    const data = completeAgencies
      .map((agency: any) => {
        const agencyId = agency._id.toString();
        const enabledChildren = childrenByAgency.get(agencyId) || [];
        const verifiableChildren =
          verifiableChildrenByAgency.get(agencyId) || [];

        const hasPublishedProperty =
          propertyOwners.has(agencyId) ||
          enabledChildren.some((child: any) =>
            propertyOwners.has(child._id.toString()),
          );

        if (!hasPublishedProperty) return null;

        const verifiableChildIds = verifiableChildren
          .filter((child: any) => propertyOwners.has(child._id.toString()))
          .map((child: any) => child._id.toString());

        return {
          _id: agencyId,
          name: agency.name,
          username: agency.username,
          avatar: agency.avatar,
          roles: agency.roles || [],
          agentInfo: this.getAgentInfo(agency),
          agentCount: verifiableChildIds.length,
          _verifiableChildIds: verifiableChildIds,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        const aVerified = a.agentInfo?.verified === true ? 1 : 0;
        const bVerified = b.agentInfo?.verified === true ? 1 : 0;
        return bVerified - aVerified;
      });

    return {
      total: data.length,
      data,
    };
  }

  async updateAgencyVerification(id: string, verified: boolean) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID de agencia invalido');
    }

    const agency = await this.userModel
      .findOne(
        {
          _id: new Types.ObjectId(id),
          roles: Role.AGENCIA,
        },
        {
          _id: 1,
          roles: 1,
        },
      )
      .lean();

    if (!agency) {
      throw new NotFoundException('Agencia no encontrada');
    }

    const idsToUpdate = await this.getAgencyVerificationTargetIds(
      id,
      verified,
    );

    const objectIds = idsToUpdate.map((userId) => new Types.ObjectId(userId));
    const updateResult = await this.userModel.updateMany(
      { _id: { $in: objectIds } },
      {
        $set: {
          'agentInfo.verified': verified,
        },
      },
    );

    return {
      success: true,
      verified,
      affectedUserIds: idsToUpdate,
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
    };
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

    if (data.profileSlug) {
      data.profileSlug = await this.ensureUniqueProfileSlug(data.profileSlug, id);
    }

    const user = await this.userModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.ensureProfileSlugForUser(user);
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

  private async getAgencyVerificationTargetIds(
    agencyId: string,
    verified: boolean,
  ): Promise<string[]> {
    const agencyObjectId = new Types.ObjectId(agencyId);
    const children = await this.userModel
      .find(
        {
          parentId: agencyObjectId,
        },
        {
          name: 1,
          phone: 1,
          avatar: 1,
          roles: 1,
          isEnabled: 1,
          agentInfo: 1,
          parentId: 1,
        },
      )
      .lean();

    if (!verified) {
      return [
        agencyId,
        ...children.map((child: any) => child._id.toString()),
      ];
    }

    const verifiableChildren = children.filter((child: any) => {
      const roles = this.getRolesArray(child);
      return (
        child.isEnabled &&
        roles.includes(Role.AGENTE) &&
        this.isVerificationProfileComplete(child)
      );
    });

    if (verifiableChildren.length === 0) {
      return [agencyId];
    }

    const childIds = verifiableChildren.map((child: any) => child._id);
    const childIdStrings = verifiableChildren.map((child: any) =>
      child._id.toString(),
    );
    const childIdSet = new Set(childIdStrings);
    const propertyOwners = new Set<string>();

    const publishedProperties = await this.propertyModel
      .aggregate([
        {
          $match: {
            status: 'published',
            $or: [
              { userId: { $in: childIds } },
              { userId: { $in: childIdStrings } },
              { agents: { $in: childIds } },
              { agents: { $in: childIdStrings } },
            ],
          },
        },
        {
          $project: {
            userId: 1,
            agents: 1,
          },
        },
      ])
      .exec();

    publishedProperties.forEach((property: any) => {
      const userId = property.userId?.toString();
      if (userId && childIdSet.has(userId)) {
        propertyOwners.add(userId);
      }

      if (Array.isArray(property.agents)) {
        property.agents.forEach((agentId: any) => {
          const agentIdString = agentId?.toString();
          if (agentIdString && childIdSet.has(agentIdString)) {
            propertyOwners.add(agentIdString);
          }
        });
      }
    });

    return [
      agencyId,
      ...verifiableChildren
        .filter((child: any) => propertyOwners.has(child._id.toString()))
        .map((child: any) => child._id.toString()),
    ];
  }

  private getRolesArray(user: any): string[] {
    if (Array.isArray(user?.roles)) return user.roles;
    if (user?.roles) return [user.roles];
    return [];
  }

  private getAgentInfo(user: any) {
    const agentInfo = user?.agentInfo;
    if (!agentInfo) return {};
    if (agentInfo instanceof Map) {
      return Object.fromEntries(agentInfo.entries());
    }
    return agentInfo;
  }

  private hasProfileValue(value: any) {
    return value !== undefined && value !== null && value !== '';
  }

  private isVerificationProfileComplete(user: any) {
    if (!user) return false;

    const roles = this.getRolesArray(user);
    const agentInfo = this.getAgentInfo(user);
    const baseOk =
      this.hasProfileValue(user.name) &&
      this.hasProfileValue(user.phone) &&
      this.hasProfileValue(user.avatar) &&
      this.hasProfileValue(agentInfo.description) &&
      this.hasProfileValue(agentInfo.address);

    if (!baseOk) return false;

    if (roles.includes(Role.AGENTE)) {
      return (
        this.hasProfileValue(agentInfo.specialization) &&
        this.hasProfileValue(agentInfo.expe) &&
        Array.isArray(agentInfo.languages) &&
        agentInfo.languages.length > 0
      );
    }

    if (roles.includes(Role.AGENCIA)) {
      return (
        this.hasProfileValue(agentInfo.expe) &&
        this.hasProfileValue(agentInfo.logo)
      );
    }

    return false;
  }

  private getProfileSlugSource(user: any) {
    return user?.name || user?.email?.split?.('@')?.[0] || 'usuario';
  }

  private normalizeProfileSlug(value: string) {
    const base = String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-')
      .slice(0, 80)
      .replace(/-+$/g, '');

    const slug = base || 'usuario';
    return this.reservedProfileSlugs.has(slug) ? `${slug}-perfil` : slug;
  }

  private getUserId(user: any) {
    return user?._id?.toString?.() || user?._id || null;
  }

  private isObjectId(value: string) {
    return /^[a-f\d]{24}$/i.test(value);
  }

  private async ensureUniqueProfileSlug(value: string, userId?: string) {
    const baseSlug = this.normalizeProfileSlug(value);
    let candidate = baseSlug;
    let suffix = 2;

    while (
      await this.userModel.exists({
        profileSlug: candidate,
        ...(userId ? { _id: { $ne: userId } } : {}),
      })
    ) {
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private async ensureProfileSlugForUser(user: any) {
    if (!user) return user;
    if (user.profileSlug) return user;

    const userId = this.getUserId(user);
    if (!userId) return user;

    const profileSlug = await this.ensureUniqueProfileSlug(this.getProfileSlugSource(user), userId);

    if (typeof user.set === 'function' && typeof user.save === 'function') {
      user.set('profileSlug', profileSlug);
      await user.save();
      return user;
    }

    await this.userModel.updateOne({ _id: userId }, { $set: { profileSlug } });
    return { ...user, profileSlug };
  }

}
