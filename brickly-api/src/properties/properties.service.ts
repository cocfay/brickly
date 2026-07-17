import { Injectable, NotFoundException, ForbiddenException  } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Property } from './schemas/property.schema';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { Types } from 'mongoose';
import { User } from '../users/user.schema';
import { ContactService } from '../contact/contact.service';
import { ActivityLogsService } from '../activitylogs/activitylogs.service';


@Injectable()
export class PropertiesService {
  constructor(
    private ContactService: ContactService,
    @InjectModel(Property.name)
    private propertyModel: Model<Property>,
    @InjectModel(User.name)
    private userModel: Model<User>,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  async create(dto: CreatePropertyDto) {
    const createData:any = {...dto};
    if(dto.userId){
      createData.userId = new Types.ObjectId(dto.userId);
    }
    createData.propertySlug = await this.ensureUniquePropertySlug(
      createData.propertySlug || this.getPropertySlugSource(createData),
    );

    return this.propertyModel.create(createData);
  }

  // findAll(query: any) {
  //   return this.propertyModel.find(query).sort({ createdAt: -1 });
  // }
  async findAll(query: any) {
        const page =
          Number(query.page) || 1;

        const limit = Math.min(
          Number(query.limit) || 10,
          100,
        );

        const skip = (page - 1) * limit;

        const filters = { ...query };
        var orderByReg = {};
        
        if(filters.orderby){
          const hasCustomOrder = filters.orderby || filters['orderby[]'];
          const orderbyArray = Array.isArray(hasCustomOrder) ? hasCustomOrder : [hasCustomOrder];
            orderbyArray.forEach((e, i) => {
              var [attrEntry, orderEntry] = e.split(':');
              if(!orderEntry){
                orderEntry = -1;
              }else if(orderEntry.toLowerCase() == "asc"){
                orderEntry = 1;
              }else if( orderEntry.toLowerCase() == "desc"){
                orderEntry = -1;
              }else{
                orderEntry = -1;
              }
              orderByReg[attrEntry] = orderEntry;
            });

        }else{
          orderByReg = {
                  'featured.isActive': -1,
                  updatedAt: -1,
                };
        }

        if(filters.agents || filters['agents[]']){

           const rawAgents = filters.agents || filters['agents[]'];
           const agentsArray = Array.isArray(rawAgents) ? rawAgents : [rawAgents];
           filters.agents = { $in: agentsArray };
           

           delete filters['agents[]'];
        }

        if(filters.userId){
          const mainUserIdObj = new Types.ObjectId(filters.userId);
          const subUsersRaw = await this.userModel.find(
            { parentId: mainUserIdObj },
            { _id: 1 }
          ).lean();
          const subUserIdsObj = subUsersRaw.map(user => user._id);
          const allowedUserIds = [mainUserIdObj, ...subUserIdsObj];
          filters.userId = { $in: allowedUserIds };
        }

        if (filters.search && filters.search.toString().trim() !== '') {
          const searchString = filters.search.toString().trim();

          filters.$text = { $search: searchString };
          const hasCustomOrder = filters.orderby || filters['orderby[]'];
          if (!hasCustomOrder) {
            orderByReg = { 'featured.isActive': -1, score: { $meta: 'textScore' } };
          }
        }

        delete filters.page;
        delete filters.limit;
        delete filters.orderby;
        delete filters.search;
        
        if (query.bedsMin !== undefined) {
          filters['layout.bedrooms'] = { $gte: Number(query.bedsMin) };
          delete filters.bedsMin;
        }

        if (query.bathsMin !== undefined) {
          filters['layout.bathrooms'] = { $gte: Number(query.bathsMin) };
          delete filters.bathsMin;
        }

        if (query.priceMin !== undefined || query.priceMax !== undefined) {
          filters['market.price'] = {};
          if (query.priceMin !== undefined) filters['market.price'].$gte = Number(query.priceMin);
          if (query.priceMax !== undefined) filters['market.price'].$lte = Number(query.priceMax);
          delete filters.priceMin;
          delete filters.priceMax;
        }

        if (query.priceUSDMin !== undefined || query.priceUSDMax !== undefined) {
          filters['market.priceUSD'] = {};
          if (query.priceUSDMin !== undefined) filters['market.priceUSD'].$gte = Number(query.priceUSDMin);
          if (query.priceUSDMax !== undefined) filters['market.priceUSD'].$lte = Number(query.priceUSDMax);
          delete filters.priceUSDMin;
          delete filters.priceUSDMax;
        }

        if (
            filters['market.price'] &&
              Object.keys(filters['market.price'])
                .length === 0
            ) {
              delete filters['market.price'];
            }
            
        if (
          filters['market.priceUSD'] &&
            Object.keys(filters['market.priceUSD'])
              .length === 0
          ) {
            delete filters['market.priceUSD'];
          }
        /** 
        const total =
          await this.propertyModel.countDocuments(
            filters,
          );

        const data =
          await this.propertyModel
            .find(filters, filters.$text ? { score: { $meta: 'textScore' } } : {})
            .sort(orderByReg)
            .skip(skip)
            .limit(limit)
            .lean(); */

        const [total, data] = await Promise.all([
              this.propertyModel.countDocuments(filters),
              this.propertyModel
                .find(filters, filters.$text ? { score: { $meta: 'textScore' } } : {})
                .sort(orderByReg)
                .skip(skip)
                .limit(limit)
                .lean()
            ]);

        const properties = await this.ensurePropertySlugsForProperties(data);

        return {
          total,
          page,
          limit,
          totalPages: Math.ceil(
            total / limit,
          ),
          data: properties,
        };
      }

  async findById(id: string) {
    let property = await this.propertyModel.findOne({
      propertySlug: this.normalizePropertySlug(id),
    });

    if (!property && this.isObjectId(id)) {
      property = await this.propertyModel.findById(id);
    }

    if (!property) throw new NotFoundException('Property not found');
    return this.ensurePropertySlugForProperty(property);
  }

  async update(id: string, dto: UpdatePropertyDto) {
    const currentProperty = await this.propertyModel.findById(id);
    if (!currentProperty) throw new NotFoundException('Property not found');

    const updateData:any = {...dto};
    if(dto.userId){
      updateData.userId = new Types.ObjectId(dto.userId);
    }

    const incomingTitle = dto.market?.title;
    const currentTitle = currentProperty.market?.title;
    if (dto.propertySlug) {
      updateData.propertySlug = await this.ensureUniquePropertySlug(
        dto.propertySlug,
        id,
      );
    } else if (incomingTitle && incomingTitle !== currentTitle) {
      updateData.propertySlug = await this.ensureUniquePropertySlug(
        incomingTitle,
        id,
      );
    } else if (!currentProperty.propertySlug) {
      updateData.propertySlug = await this.ensureUniquePropertySlug(
        this.getPropertySlugSource(currentProperty),
        id,
      );
    }

    const property = await this.propertyModel.findByIdAndUpdate(id,{ $set: updateData }, {
      new: true,
    });
    if (!property) throw new NotFoundException('Property not found');

    if(property.status === "pre-published"){
      let ntfyTitle = "Propiedad pendiente de aprobación";
      let ntfyMessage = `${property.market.title.slice(0,20)}... necesita tu aprobación  https://www.bricklyhomes.com/cpanel/propiedades/view/${property._id}`;
      await this.ContactService.ntfySend({tag:"br-propiedad", title:ntfyTitle, message:ntfyMessage})
    }
    return property;
  }

  async remove(id: string) {
    const property = await this.propertyModel.findByIdAndDelete(id);
    if (!property) throw new NotFoundException('Property not found');
    return { message: 'Property deleted' };
  }

  async incrementVisits(propertyId: string) {
    const property = await this.findById(propertyId);

    await this.activityLogsService.create({
      type: 'property',
      userId: property._id.toString(),
      action: 'visit',
    });
    
    return this.propertyModel.findByIdAndUpdate(
      property._id,
      { $inc: { visitCounter: 1 } },
      { new: true }
    );
  }
  async incrementClicks(propertyId: string) {
    const property = await this.findById(propertyId);

    await this.activityLogsService.create({
      type: 'property',
      userId: property._id.toString(),
      action: 'click',
    });
    return this.propertyModel.findByIdAndUpdate(
      property._id,
      { $inc: { clickCounter: 1 } },
      { new: true }
    );
  }

  async activateFeatured(propertyId: string, isActive: boolean, userId?: string) {

    const property = await this.propertyModel.findById(propertyId);

    if (!property) throw new NotFoundException('Propiedad no encontrada');

    if (userId && property.userId.toString() !== userId) {
      throw new ForbiddenException('No puedes destacar esta propiedad');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    property.featured = {
      isActive: isActive,
      expiresAt
    };

    await property.save();

    return property;
  }
  async getTotalProperties(userId: string){

    const mainUserIdObj = new Types.ObjectId(userId);

      // 1. Obtener todos los IDs de los subusuarios de forma anticipada
      const subUsersRaw = await this.userModel.find(
        { parentId: mainUserIdObj },
        { _id: 1 }
      ).lean();
      
      const subUserIdsObj = subUsersRaw.map(user => user._id);

      // Array unificado de ObjectIds (Usuario principal + Subusuarios)
      const allowedUserIds = [mainUserIdObj, ...subUserIdsObj];

      // 2. Cálculo de propiedades totales usando el nuevo array de pertenencia
      const totalPublished =
        await this.propertyModel.countDocuments({
          userId: { $in: allowedUserIds }, 
          status: 'published',
        });

      const total =
        await this.propertyModel.countDocuments({
          userId: { $in: allowedUserIds }, 
        });

        return { total, totalPublished }

  }
  async getMetrics(userId: string) {
      const now = new Date();
      const startCurrentMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      );
      const startPreviousMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      );

      const mainUserIdObj = new Types.ObjectId(userId);

      // 1. Obtener todos los IDs de los subusuarios de forma anticipada
      const subUsersRaw = await this.userModel.find(
        { parentId: mainUserIdObj },
        { _id: 1 }
      ).lean();
      
      const subUserIdsObj = subUsersRaw.map(user => user._id);

      // Array unificado de ObjectIds (Usuario principal + Subusuarios)
      const allowedUserIds = [mainUserIdObj, ...subUserIdsObj];

      // 2. Cálculo de propiedades totales usando el nuevo array de pertenencia
      const totalProperties =
        await this.propertyModel.countDocuments({
          userId: { $in: allowedUserIds }, 
          status: 'published',
        });

      const totalUntilPreviousMonth =
        await this.propertyModel.countDocuments({
          userId: { $in: allowedUserIds },
          status: 'published',
          createdAt: {
            $lt: startCurrentMonth,
          },
        });

      let growthPercentage = 0;
      if (totalUntilPreviousMonth > 0) {
        growthPercentage =
          (
            (totalProperties -
              totalUntilPreviousMonth) /
            totalUntilPreviousMonth
          ) * 100;
      } else if (totalProperties > 0) {
        growthPercentage = 100;
      }

      // Agregaciones de Propiedades filtradas por el grupo familiar/empresa
      const propertiesByType =
        await this.propertyModel.aggregate([
          {
            $match: {
              userId: { $in: allowedUserIds },
              status: 'published',
            },
          },
          {
            $group: {
              _id: '$market.type',
              total: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              type: '$_id',
              total: 1,
            },
          },
        ]);

      const propertiesByOperation =
        await this.propertyModel.aggregate([
          {
            $match: {
              userId: { $in: allowedUserIds },
              status: 'published',
            },
          },
          {
            $group: {
              _id: '$market.mode',
              total: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              operation: '$_id',
              total: 1,
            },
          },
        ]);

      const propertiesByDepartment =
        await this.propertyModel.aggregate([
          {
            $match: {
              userId: { $in: allowedUserIds },
              status: 'published',
            },
          },
          {
            $group: {
              _id: '$location.department',
              total: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              department: '$_id',
              total: 1,
            },
          },
        ]);

      const agenciaMD = await this.userModel.findById(userId);
      let clickCounterAgency = 0;
      let clickCounterWsAgency = 0;
      if (!agenciaMD) {
        throw new Error('Agencia no encontrada');
      }
      if (agenciaMD.clickCounter) {
        clickCounterAgency = agenciaMD.clickCounter;
      }
      if (agenciaMD.clickCounterWs) {
        clickCounterWsAgency = agenciaMD.clickCounterWs;
      }

      // Sumar visitas y clicks de todas las propiedades pertenecientes al grupo
      const totals =
        await this.propertyModel.aggregate([
          {
            $match: {
              userId: { $in: allowedUserIds },
              status: 'published',
            },
          },
          {
            $group: {
              _id: null,
              totalVisits: {
                $sum: '$visitCounter',
              },
              totalClicks: {
                $sum: '$clickCounter',
              },
            },
          },
        ]);

      const totalsAg =
        await this.userModel.aggregate([
          {
            $match: {
              parentId: mainUserIdObj,
            },
          },
          {
            $group: {
              _id: null,
              totalClicksWs: {
                $sum: '$clickCounterWs',
              },
              totalClicks: {
                $sum: '$clickCounter',
              },
            },
          },
        ]);

      const totalVisits = totals[0]?.totalVisits || 0;
      const totalClicksAg = totalsAg[0]?.totalClicks || 0;
      const totalClicksWsAg = totalsAg[0]?.totalClicksWs || 0;
      const totalClicks = Number(clickCounterAgency) + Number(totalClicksAg);
      const totalClicksWs = Number(clickCounterWsAgency) + Number(totalClicksWsAg);

      // Obtener IDs de propiedades globalizados (Principal + Subusuarios) para Favoritos
      const propertyIds = await this.propertyModel.find(
        { userId: { $in: allowedUserIds }, status: 'published' },
        { _id: 1 },
      );
      const ids = propertyIds.map(
        property => property._id,
      );

      const totalFavorites =
        await this.userModel.countDocuments({
          favorites: {
            $in: ids,
          },
        });

      const favoriteAgg =
        await this.userModel.aggregate([
          {
            $project: {
              matchedFavorites: {
                $filter: {
                  input: '$favorites',
                  as: 'favorite',
                  cond: {
                    $in: ['$$favorite', ids],
                  },
                },
              },
            },
          },
          {
            $project: {
              total: {
                $size: { $ifNull: ['$matchedFavorites', []] }, // Corregido bug original: $size en vez de retornar el array completo al $sum
              },
            },
          },
          {
            $group: {
              _id: null,
              totalFavoritesAll: {
                $sum: '$total',
              },
            },
          },
        ]);

      const totalFavoritesAll = favoriteAgg[0]?.totalFavoritesAll || 0;

      // Tops de propiedades unificados
      const topPropertiesRaw =
        await this.propertyModel
          .find(
            { userId: { $in: allowedUserIds }, status: 'published' },
            {
              visitCounter: 1,
              market: 1,
              media: 1,
            },
          )
          .sort({ visitCounter: -1 })
          .limit(5)
          .lean();

      const topProperties: any = {};
      topPropertiesRaw.forEach((property, index) => {
        topProperties[(index + 1).toString()] = {
          id: property._id,
          name: property.market?.title || '',
          price: property.market?.price || 0,
          priceUSD: property.market?.priceUSD || 0,
          picture:
            property.media?.photos?.find(
              (photo: any) => photo.isMain,
            )?.path ||
            property.media?.photos?.[0]?.path ||
            '',
          visitCounter: property.visitCounter || 0,
        };
      });

      const topPropertiesRawMinus =
        await this.propertyModel
          .find(
            { userId: { $in: allowedUserIds }, status: 'published' },
            {
              visitCounter: 1,
              market: 1,
              media: 1,
            },
          )
          .sort({ visitCounter: 1 })
          .limit(5)
          .lean();

      const topPropertiesMinus: any = {};
      topPropertiesRawMinus.forEach((property, index) => {
        topPropertiesMinus[(index + 1).toString()] = {
          id: property._id,
          name: property.market?.title || '',
          price: property.market?.price || 0,
          priceUSD: property.market?.priceUSD || 0,
          picture:
            property.media?.photos?.find(
              (photo: any) => photo.isMain,
            )?.path ||
            property.media?.photos?.[0]?.path ||
            '',
          visitCounter: property.visitCounter || 0,
        };
      });

      // Top de Agentes asociados (Se mantiene buscando los que dependen de tu parentId)
      const topAgentsRaw = await this.userModel.aggregate([
        {
          $match: {
            parentId: mainUserIdObj,
          },
        },
        {
          $lookup: {
            from: 'properties',
            let: { userIdStr: { $toString: '$_id' } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$$userIdStr', { $ifNull: ['$agents', []] }]
                  }
                }
              },
              {
                $project: { _id: 1 }
              }
            ],
            as: 'assignedProperties',
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            avatar: 1,
            ratingAverage: 1,
            ratingCount: 1,
            clickCounterWs: 1,
            clickCounter: 1,
            propertiesAssign: {
              $size: {
                $ifNull: ['$assignedProperties', []],
              },
            },
          },
        },
        {
          $sort: {
            ratingAverage: -1,
            ratingCount: -1,
            propertiesAssign: -1,
          },
        },
      ]);

      const topAgents: any = {};
      topAgentsRaw.forEach((agent, index) => {
        topAgents[(index + 1).toString()] = {
          id: agent._id,
          name: agent.name || '',
          avatar: agent.avatar || '',
          ratingAverage: agent.ratingAverage || 0,
          ratingCount: agent.ratingCount || 0,
          clickCounterWs: agent.clickCounterWs || 0,
          clickCounter: agent.clickCounter || 0,
          propertiesAssign: agent.propertiesAssign || 0,
        };
      });

      return {
        totalProperties,
        growthPercentage: Number(growthPercentage.toFixed(2)),
        propertiesByType,
        propertiesByOperation,
        propertiesByDepartment,
        totalVisits,
        totalClicks,
        totalClicksWs,
        totalFavorites,
        totalFavoritesAll,
        topProperties,
        topPropertiesMinus, 
        topAgents,
      };
    }

  async getAgentMetrics(agentId: string) {

        const objectId = agentId;//new Types.ObjectId(agentId);

        // =========================
        // AGENTE
        // =========================

        const agent = await this.userModel.findById(agentId);

        if (!agent) {
          throw new Error('Agente no encontrado');
        }

        // =========================
        // PROPIEDADES ASIGNADAS
        // =========================

        const assignedProperties = await this.propertyModel.countDocuments({
          agents: objectId,
        });

        // =========================
        // POR TIPO
        // =========================

        const propertiesByType = await this.propertyModel.aggregate([
          {
            $match: {
              agents: objectId,
              status :'published',
            },
          },
          {
            $group: {
              _id: '$market.type',
              total: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              type: '$_id',
              total: 1,
            },
          },
        ]);

        // =========================
        // POR OPERACION
        // =========================

        const propertiesByOperation = await this.propertyModel.aggregate([
          {
            $match: {
              agents: objectId,
              status :'published',
            },
          },
          {
            $group: {
              _id: '$market.mode',
              total: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              operation: '$_id',
              total: 1,
            },
          },
        ]);

        // =========================
        // TOP 5 PROPIEDADES MAS VISTAS
        // =========================

        const topPropertiesRaw = await this.propertyModel
          .find({
            agents: objectId,
          })
          .sort({ visitCounter: -1 })
          .limit(5)
          .select({
            'market.title': 1,
            'market.price': 1,
            'market.priceUSD': 1,
            'media.photos': 1,
            visitCounter: 1,
          });

        const topProperties: any = {};

        topPropertiesRaw.forEach((property, index) => {

          const mainPicture =
            property.media?.photos?.find((p: any) => p.isMain)?.path ||
            property.media?.photos?.[0]?.path ||
            null;

          topProperties[(index + 1).toString()] = {
            id: property._id,
            name: property.market?.title || '',
            price: property.market?.price || 0,
            priceUSD: property.market?.priceUSD || 0,
            picture: mainPicture,
            visitCounter: property.visitCounter || 0,
          };
        });

        // =========================
        // TOP 5 PROPIEDADES MENOS VISTAS
        // =========================

        const topPropertiesRawmin = await this.propertyModel
          .find({
            agents: objectId,
          })
          .sort({ visitCounter: 1 })
          .limit(5)
          .select({
            'market.title': 1,
            'market.price': 1,
            'market.priceUSD': 1,
            'media.photos': 1,
            visitCounter: 1,
          });

        const topPropertiesMinus: any = {};

        topPropertiesRawmin.forEach((property, index) => {

          const mainPicturemin =
            property.media?.photos?.find((p: any) => p.isMain)?.path ||
            property.media?.photos?.[0]?.path ||
            null;

          topPropertiesMinus[(index + 1).toString()] = {
            id: property._id,
            name: property.market?.title || '',
            price: property.market?.price || 0,
            priceUSD: property.market?.priceUSD || 0,
            picture: mainPicturemin,
            visitCounter: property.visitCounter || 0,
          };
        });

        // =========================
        // RESPONSE
        // =========================

        return {
          totalClicksWs: agent.clickCounterWs || 0,

          totalClicks: agent.clickCounter || 0,

          rating: {
            average: agent.ratingAverage || 0,
            total: agent.ratingCount || 0,
          },

          assignedProperties,

          propertiesByType,

          propertiesByOperation,

          topProperties,

          topPropertiesMinus,
        };
      }


  async getMetricsAdm(){
    // =========================
    // TOTAL AGENCIAS
    // =========================

    const totalAgencies = await this.userModel.countDocuments({
          roles: 'agencia',
        });

    // =========================
    // TOTAL Agentes
    // =========================

    const totalAgents = await this.userModel.countDocuments({
          roles: 'agente',
        });

    // =========================
    // TOTAL AGENTES VERIFICADOS
    // =========================

    const totalAgentsVerified = await this.userModel.countDocuments({
          roles: 'agente',
          "agentInfo.verified": true
        });
 

    //===========================
    //TOTAL AGENTES DESTACADOS
    //==========================

    const totalAgentsFeatured = await this.userModel.countDocuments({
          roles: 'agente',
          featured_expire: {
              $gt: new Date(),
            },
        });


    //===========================
    //TOTAL AGENCIAS DESTACADAS
    //==========================

    const totalAgenciesFeatured =await this.userModel.countDocuments({
          roles: 'agencia',
          featured_expire: {
              $gt: new Date(),
            },
        });

    // =========================
    // TOTAL PROPIEDADES PUBLICADAS
    // =========================

    const totalPropertiesPublished =
        await this.propertyModel.countDocuments({
           status :'published',
        });
    
    //===========================
    //TOTAL PROPIEDADES DESTACADAS
    //==========================

    const totalPropertiesFeatured = await this.propertyModel.countDocuments({
          status :'published',
          'featured.expiresAt': {
              $gt: new Date(),
            },
        });

    //========================================
    // TOTAL DE PROPIEDADES CREADAS ESTE MES
    //=========================================
    const nowDatep = new Date();

    const startOfMonth = new Date(
      nowDatep.getFullYear(),
      nowDatep.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );

    const startOfNextMonth = new Date(
      nowDatep.getFullYear(),
      nowDatep.getMonth() + 1,
      1,
      0,
      0,
      0,
      0,
    );

    const totalPropertiesThisMonth =
      await this.propertyModel.countDocuments({
        status: 'published',
        createdAt: {
          $gte: startOfMonth,
          $lt: startOfNextMonth,
        },
      });
    
    // =========================
    // PROPIEDADES POR TIPO
    // =========================

      const propertiesByType =
        await this.propertyModel.aggregate([
          {
            $match: {
              status :'published',
            },
          },
          {
            $group: {
              _id: '$market.type',
              total: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              type: '$_id',
              total: 1,
            },
          },
        ]);

      // =========================
      // PROPIEDADES POR OPERACION
      // =========================

      const propertiesByOperation =
        await this.propertyModel.aggregate([
          {
            $match: {
              status :'published',
            },
          },
          {
            $group: {
              _id: '$market.mode',
              total: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              operation: '$_id',
              total: 1,
            },
          },
        ]);

      // =========================
      // PROPIEDADES POR DEPARTAMENTO
      // =========================

      const propertiesByDepartment =
        await this.propertyModel.aggregate([
          {
            $match: {
              status :'published',
            },
          },
          {
            $group: {
              _id: '$location.department',
              total: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              department: '$_id',
              total: 1,
            },
          },
        ]);

    ///////////////////////////
    // TOTAL VISITAS Y CLICKS
    //////////////////////////

        const totalspropertyVisit =
        await this.propertyModel.aggregate([
          {
            $match: {
              status :'published',
            },
          },
          {
            $group: {
              _id: null,
              totalVisits: {
                $sum: '$visitCounter',
              },
            },
          },
        ]);

        const totalsClicksUsAg =
        await this.userModel.aggregate([
          {
            $match: {
              roles:  'agencia',
            },
          },
          {
            $group: {
              _id: null,
              totalClicksWs: {
                $sum: '$clickCounterWs',
              },
              totalClicks: {
                $sum: '$clickCounter',
              },
            },
          },
        ]);

        const totalsClicksUsAgt =
        await this.userModel.aggregate([
          {
            $match: {
              roles:  'agente',
            },
          },
          {
            $group: {
              _id: null,
              totalClicksWs: {
                $sum: '$clickCounterWs',
              },
              totalClicks: {
                $sum: '$clickCounter',
              },
            },
          },
        ]);

      const totalVisits =
        totalspropertyVisit[0]?.totalVisits || 0;

      const totalClicksAg =
        totalsClicksUsAg[0]?.totalClicks || 0;

      const totalClicksWsAg =
      totalsClicksUsAg[0]?.totalClicksWs || 0;

      const totalClicksAgt =
      totalsClicksUsAgt[0]?.totalClicks || 0;

      const totalClicksWsAgt =
      totalsClicksUsAgt[0]?.totalClicksWs || 0;

      const totalClicks = Number(totalClicksAg) + Number(totalClicksAgt);
      const totalClicksWs = Number(totalClicksWsAg) + Number(totalClicksWsAgt);


      // =========================
      // Top 5 Agents
      // =========================

        const topAgentsRaw = await this.userModel.aggregate([
          {
            $match: {
              roles:  'agente',
            },
          },

          // buscar propiedades asignadas
          {
            $lookup: {
              from: 'properties',
              localField: '_id',
              foreignField: 'agents',
              as: 'assignedProperties',
            },
          },

          {
            $project: {
              _id: 1,
              name: 1,
              avatar: 1,
              ratingAverage: 1,
              ratingCount: 1,
              clickCounterWs: 1,
              clickCounter: 1,

              propertiesAssign: {
                $size: {
                  $ifNull: ['$assignedProperties', []],
                },
              },
            },
          },

          {
            $sort: {
              ratingAverage: -1,
              ratingCount: -1,
              propertiesAssign: -1
            },
          },

          {
            $limit: 5,
          },
        ]);

        const topAgents: any = {};

        topAgentsRaw.forEach((agent, index) => {
          topAgents[(index + 1).toString()] = {
            id: agent._id,

            name: agent.name || '',

            avatar: agent.avatar || '',

            ratingAverage:
              agent.ratingAverage || 0,

            ratingCount:
              agent.ratingCount || 0,

            clickCounterWs:
              agent.clickCounterWs || 0,

            clickCounter:
              agent.clickCounter || 0,

            propertiesAssign:
              agent.propertiesAssign || 0,
          };
        });



    return {
      totalAgencies,
      totalAgents,
      totalAgentsFeatured,
      totalAgentsVerified,
      totalAgenciesFeatured,
      totalPropertiesPublished,
      totalPropertiesThisMonth,
      totalPropertiesFeatured,
      propertiesByType,
      propertiesByOperation,
      propertiesByDepartment,
      totalVisits,
      totalClicks,
      totalClicksWs,
      topAgents,

    }
  }
  async getAgentPropertiesReport(agencyId: string) {
    
    return this.propertyModel.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(agencyId),
        },
      },

      {
        $unwind: '$agents',
      },
      {
        $addFields: {
          agents: {
            $toObjectId: '$agents'
          }
        }
      },

      // Agrupar por agente + estado
      {
        $group: {
          _id: {
            agentId: '$agents',
            status: '$status',
          },
          count: {
            $sum: 1,
          },
        },
      },

      // Agrupar nuevamente por agente
      {
        $group: {
          _id: '$_id.agentId',

          totalProperties: {
            $sum: '$count',
          },

          statuses: {
            $push: {
              k: '$_id.status',
              v: '$count',
            },
          },
        },
      },

      // Convertir array a objeto
      {
        $addFields: {
          statuses: {
            $arrayToObject: '$statuses',
          },
        },
      },

      // Obtener información del agente
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'agent',
        },
      },

      {
        $unwind: '$agent',
      },

      {
        $project: {
          _id: 0,
          userId: '$_id',
          name: '$agent.name',
          email: '$agent.email',
          roles: '$agent.roles',
          totalProperties: 1,
          statuses: 1,
        },
      },

      {
        $sort: {
          totalProperties: -1,
        },
      },
    ]);
  }
  async getPriceRange() {

        const result =
          await this.propertyModel.aggregate([
            {
              $match: {
                status: 'published',
              },
            },
            {
              
              $group: {
                _id: null,

                minPrice: {
                  $min: '$market.price',
                },

                maxPrice: {
                  $max: '$market.price',
                },

                minPriceUSD: {
                  $min: '$market.priceUSD',
                },

                maxPriceUSD: {
                  $max: '$market.priceUSD',
                },
                minSizeLandM2: {
                  $min: '$dimensions.landM2',
                },
                maxSizeLandM2: {
                  $max: '$dimensions.landM2',
                },
                minSizeConstructionM2: {
                  $min: '$dimensions.constructionM2',
                },
                maxSizeConstructionM2: {
                  $max: '$dimensions.constructionM2',
                },
                minSizeStorageM2: {
                  $min: '$dimensions.storageM2',
                },
                maxSizeStorageM2: {
                  $max: '$dimensions.storageM2',
                },
              },
            },
          ]);

        if (!result.length) {
          return {
            price: {
              minPrice: 0,
              maxPrice: 0,
              minPriceUSD: 0,
              maxPriceUSD: 0,
            },
            size:{
              minSizeLandM2:0,
              maxSizeLandM2:0,
              minSizeConstructionM2:0,
              maxSizeConstructionM2:0,
              minSizeStorageM2:0,
              maxSizeStorageM2:0,

            }
          };
        }

        return {
          price:{
            minPrice: result[0].minPrice,
            maxPrice: result[0].maxPrice,
            minPriceUSD: result[0].minPriceUSD,
            maxPriceUSD: result[0].maxPriceUSD,
          },
          size:{
            minSizeLandM2: result[0].minSizeLandM2,
            maxSizeLandM2: result[0].maxSizeLandM2,
            minSizeConstructionM2 : result[0].minSizeConstructionM2,
            maxSizeConstructionM2 : result[0].maxSizeConstructionM2,
            minSizeStorageM2 : result[0].minSizeStorageM2,
            maxSizeStorageM2 : result[0].maxSizeStorageM2
          }
        };
      }

  async disablePropertiesByPlan(userId: string) {
    const mainUserIdObj = new Types.ObjectId(userId);
    const subUsers = await this.userModel.find(
      { parentId: mainUserIdObj },
      { _id: 1 },
    ).lean();
    const subUserIds = subUsers.map(u => u._id);
    const allUserIds = [mainUserIdObj, ...subUserIds];

    await this.propertyModel.updateMany(
      { userId: { $in: allUserIds }, status: 'published' },
      { $set: { status: 'disabled', disabledByPlan: true } },
    );
  }

  async reactivatePropertiesByPlan(userId: string) {
    const mainUserIdObj = new Types.ObjectId(userId);
    const subUsers = await this.userModel.find(
      { parentId: mainUserIdObj },
      { _id: 1 },
    ).lean();
    const subUserIds = subUsers.map(u => u._id);
    const allUserIds = [mainUserIdObj, ...subUserIds];

    await this.propertyModel.updateMany(
      { userId: { $in: allUserIds }, disabledByPlan: true },
      { $set: { status: 'published', disabledByPlan: false } },
    );
  }

  async reactivatePropertiesByPlanForUser(userId: string) {
    await this.propertyModel.updateMany(
      { userId: new Types.ObjectId(userId), disabledByPlan: true },
      { $set: { status: 'published', disabledByPlan: false } },
    );
  }

  private getPropertySlugSource(property: any) {
    return property?.market?.title || property?.folderId || 'propiedad';
  }

  private normalizePropertySlug(value: string) {
    const base = String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-')
      .slice(0, 100)
      .replace(/-+$/g, '');

    const slug = base || 'propiedad';
    return this.reservedPropertySlugs.has(slug) ? `${slug}-propiedad` : slug;
  }

  private reservedPropertySlugs = new Set([
    'metricas',
    'metricas-adm',
    'var-ranges',
    'count',
    'add',
    'edit',
    'view',
    'planes',
    'propiedad',
    'propiedades',
    'api',
  ]);

  private isObjectId(value: string) {
    return /^[a-f\d]{24}$/i.test(value);
  }

  private getPropertyId(property: any) {
    return property?._id?.toString?.() || property?._id || null;
  }

  private async ensureUniquePropertySlug(value: string, propertyId?: string) {
    const baseSlug = this.normalizePropertySlug(value);
    let candidate = baseSlug;
    let suffix = 2;

    while (
      await this.propertyModel.exists({
        propertySlug: candidate,
        ...(propertyId ? { _id: { $ne: propertyId } } : {}),
      })
    ) {
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private async ensurePropertySlugForProperty(property: any) {
    if (!property) return property;
    if (property.propertySlug) return property;

    const propertyId = this.getPropertyId(property);
    if (!propertyId) return property;

    const propertySlug = await this.ensureUniquePropertySlug(
      this.getPropertySlugSource(property),
      propertyId,
    );

    if (typeof property.set === 'function' && typeof property.save === 'function') {
      property.set('propertySlug', propertySlug);
      await property.save();
      return property;
    }

    await this.propertyModel.updateOne({ _id: propertyId }, { $set: { propertySlug } });
    return { ...property, propertySlug };
  }

  private async ensurePropertySlugsForProperties(properties: any[]) {
    return Promise.all(
      properties.map((property) => this.ensurePropertySlugForProperty(property)),
    );
  }
}
