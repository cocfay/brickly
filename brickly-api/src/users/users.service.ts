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
import { PlanMaxProfiles, PlanRoleMap, computeExpirationDate } from '../common/enums/plan.enum';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

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
    private readonly subService: SubscriptionsService,
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

      // Búsqueda por texto en nombre, email y roles
      if (filters.search && filters.search.toString().trim() !== '') {
        const searchString = filters.search.toString().trim();
        const searchRegex = new RegExp(searchString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const searchOr = [
          { name: { $regex: searchRegex } },
          { email: { $regex: searchRegex } },
          { roles: { $regex: searchRegex } },
        ];
        delete filters.search;

        if (filters.$or) {
          const existingOr = filters.$or;
          delete filters.$or;
          filters.$and = [
            { $or: existingOr },
            { $or: searchOr },
          ];
        } else {
          filters.$or = searchOr;
        }
      }

      if (filters.parentId !== undefined) {
        const parentIdValue = Array.isArray(filters.parentId)
          ? filters.parentId[0]
          : filters.parentId;
        const normalizedParentId = parentIdValue?.toString().trim().toLowerCase();

        if (
          !normalizedParentId ||
          ['none', 'null', 'empty', 'unassigned'].includes(normalizedParentId)
        ) {
          filters.$or = [
            { parentId: { $exists: false } },
            { parentId: null },
            { parentId: '' },
          ];
          delete filters.parentId;
        } else {
          if (!Types.ObjectId.isValid(parentIdValue)) {
            throw new BadRequestException('parentId invalido');
          }
          filters.parentId = new Types.ObjectId(parentIdValue);
        }
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

    if (data.name && !data.profileSlug) {
      data.profileSlug = await this.ensureUniqueProfileSlug(this.getProfileSlugSource(data), id);
    }

    if (data.profileSlug) {
      data.profileSlug = await this.ensureUniqueProfileSlug(data.profileSlug, id);
    }

    // Detectar si isEnabled cambia de false a true para reactivar propiedades y validar límite
    const previousUser = await this.userModel.findById(id).lean();
    const wasDisabled = previousUser && previousUser.isEnabled === false;
    const willEnable = data.isEnabled === true;

    // Validar límite de agentes activos del plan al activar un sub-usuario
    if (willEnable && previousUser?.parentId) {
      const parentId = previousUser.parentId.toString();
      const enabledCount = await this.countEnabledAgentsByParent(parentId);
      const limitInfo = await this.getAgentLimitInfo(parentId);

      // +1 porque estamos a punto de activar este agente
      if (limitInfo.max > 0 && (enabledCount + 1) > limitInfo.max) {
        throw new BadRequestException(
          `No puedes activar más agentes. Límite de tu plan: ${limitInfo.max} agente(s) activos. ` +
          `Actualmente tienes ${enabledCount} activo(s). Desactiva otro agente primero o mejora tu plan.`,
        );
      }
    }

    const user = await this.userModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    // Reactivar propiedades del usuario cuando pasa a estar habilitado
    if (wasDisabled && willEnable) {
      await this.propertyModel.updateMany(
        { userId: new Types.ObjectId(id), disabledByPlan: true },
        { $set: { status: 'published', disabledByPlan: false } },
      );
    }

    return this.ensureProfileSlugForUser(user);
  }

  /**
   * Activa (o refresca) la suscripción de un usuario: REEMPLAZA sus roles
   * relacionados a planes por el rol correspondiente al plan adquirido
   * (evita que un usuario quede con, por ejemplo, "agente" Y "agencia" a
   * la vez, lo cual causaba conflictos en la plataforma). El rol `admin`
   * se preserva siempre por seguridad, para no desadministrar una cuenta
   * por accidente si un admin llega a probar una suscripción.
   * Es idempotente: llamarla varias veces con los mismos datos no causa
   * problemas (útil porque puede dispararse tanto desde el pago exitoso
   * del checkout como, más tarde, desde subscription.create o cada renovación).
   */
  async activateSubscription(
    userId: string,
    data: { plan: string; role: Role; expiresAt: Date },
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) return null;

    const effectiveMax = await this.getEffectiveMaxProfiles(user);

    // Si el usuario era agencia y el nuevo rol no es de agencia,
    // o el plan tiene menos cupos que los agentes actuales, desactivar agentes hijos
    if (user.roles?.includes(Role.AGENCIA)) {
      const currentAgents = await this.countAgentsByParent(userId);
      if (
        data.role !== Role.AGENCIA ||
        effectiveMax < currentAgents
      ) {
        await this.deactivateChildAgents(userId);
      } else {
        // Reactivar agentes hijos si el plan tiene suficientes cupos
        await this.reactivateChildAgents(userId);
      }
    }

    // Reactivar propiedades del usuario que fueron desactivadas por plan
    if (data.role === Role.AGENTE || data.role === Role.AGENCIA || data.role === Role.DESARROLLADORA) {
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

    // Limpiar customMaxProfiles si el nuevo plan no es AGENCIA_DIAMOND_P
    if (data.plan !== 'AGENCIA_DIAMOND_P') {
      user.customMaxProfiles = undefined;
    }

    const preservedRoles = (user.roles || []).filter((r) => r === Role.ADMIN);
    user.roles = Array.from(new Set([...preservedRoles, data.role]));

    user.subscriptionPlan = data.plan;
    user.subscription_expire = data.expiresAt;
    user.subscriptionStatus = 'ACTIVE';

    await user.save();
    return user;
  }

  /**
   * Desactiva la suscripción de un usuario: REEMPLAZA sus roles por
   * `cliente` (quitando el rol del plan que tenía) y marca el estado
   * correspondiente (CANCELED / PAST_DUE). Se usa tanto para cancelación
   * definitiva como para un cobro recurrente no procesado. El rol `admin`
   * se preserva siempre por seguridad. Mantiene `subscriptionPlan` como
   * referencia histórica de cuál fue el último plan adquirido.
   */
  async deactivateSubscription(
    userId: string,
    data: { status: 'CANCELED' | 'PAST_DUE' },
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) return null;

    // Si la cuenta que se degrada es una agencia, desactivar todos sus agentes
    if (user.roles?.includes(Role.AGENCIA)) {
      await this.deactivateChildAgents(userId);
    }

    // Desactivar propiedades del usuario y sus sub-usuarios (marcarlas como disabledByPlan)
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

    // Limpiar customMaxProfiles al degradar
    user.customMaxProfiles = undefined;

    const preservedRoles = (user.roles || []).filter((r) => r === Role.ADMIN);
    user.roles = Array.from(new Set([...preservedRoles, Role.CLIENTE]));

    user.subscriptionStatus = data.status;
    if (data.status === 'CANCELED') {
      user.subscription_expire = undefined;
    }

    await user.save();
    return user;
  }

  /**
   * Asigna un plan a un usuario de forma manual (admin).
   * Cancela la suscripción anterior en Recurrente si existe y se solicita.
   * Guarda customMaxProfiles si se proporciona (para AGENCIA_DIAMOND_P).
   */
  async assignPlan(
    userId: string,
    data: { plan: string; confirmCancel: boolean; customMaxProfiles?: number },
  ) {
    const role = PlanRoleMap[data.plan];
    if (!role) {
      throw new BadRequestException(`Plan "${data.plan}" no tiene un rol asociado`);
    }

    if (data.confirmCancel) {
      await this.subService.cancelRemotely(userId);
    }

    // Guardar customMaxProfiles antes de activateSubscription
    // para que getEffectiveMaxProfiles lo use en la validación
    if (data.customMaxProfiles != null && data.plan === 'AGENCIA_DIAMOND_P') {
      await this.userModel.updateOne(
        { _id: new Types.ObjectId(userId) },
        { $set: { customMaxProfiles: data.customMaxProfiles } },
      );
    } else {
      await this.userModel.updateOne(
        { _id: new Types.ObjectId(userId) },
        { $unset: { customMaxProfiles: '' } },
      );
    }

    const expiresAt = computeExpirationDate(data.plan);
    return this.activateSubscription(userId, { plan: data.plan, role, expiresAt });
  }

  async deactivateChildAgents(agencyId: string) {
    const subUsers = await this.userModel.find(
      {
        parentId: new Types.ObjectId(agencyId),
        roles: Role.AGENTE,
      },
      { _id: 1 },
    ).lean();

    const subUserIds = subUsers.map(u => u._id);

    await this.userModel.updateMany(
      { _id: { $in: subUserIds } },
      { $set: { isEnabled: false } },
    );

    // Desactivar propiedades publicadas de los sub-usuarios
    if (subUserIds.length > 0) {
      await this.propertyModel.updateMany(
        { userId: { $in: subUserIds }, status: 'published' },
        { $set: { status: 'disabled', disabledByPlan: true } },
      );
    }
  }

  async reactivateChildAgents(agencyId: string) {
    const disabledAgents = await this.userModel.find(
      {
        parentId: new Types.ObjectId(agencyId),
        roles: Role.AGENTE,
        isEnabled: false,
      },
      { _id: 1 },
    ).lean();

    if (disabledAgents.length === 0) return;

    // Respetar el límite del plan: solo activar hasta el máximo permitido
    const limitInfo = await this.getAgentLimitInfo(agencyId);
    const enabledCount = await this.countEnabledAgentsByParent(agencyId);
    const availableSlots = limitInfo.max - enabledCount;

    if (availableSlots <= 0) return;

    const agentsToActivate = disabledAgents.slice(0, availableSlots);
    const agentIds = agentsToActivate.map(a => a._id.toString());

    await this.userModel.updateMany(
      { _id: { $in: agentsToActivate.map(a => a._id) } },
      { $set: { isEnabled: true } },
    );

    // Reactivar propiedades de cada agente reactivado
    for (const agentId of agentIds) {
      await this.propertyModel.updateMany(
        { userId: new Types.ObjectId(agentId), disabledByPlan: true },
        { $set: { status: 'published', disabledByPlan: false } },
      );
    }
  }

  /**
   * Cuenta los agentes (rol AGENTE) creados bajo una agencia/desarrolladora,
   * sin importar si están activos o desactivados (isEnabled), ya que el
   * registro sigue ocupando un cupo del plan mientras exista.
   */
  async countAgentsByParent(parentId: string) {
    return this.userModel.countDocuments({
      parentId: new Types.ObjectId(parentId),
      roles: Role.AGENTE,
    });
  }

  /**
   * Cuenta solo los agentes ACTIVOS (isEnabled: true) bajo una agencia.
   */
  async countEnabledAgentsByParent(parentId: string) {
    return this.userModel.countDocuments({
      parentId: new Types.ObjectId(parentId),
      roles: Role.AGENTE,
      isEnabled: true,
    });
  }

  /**
   * Devuelve la info de límite de agentes para una agencia/desarrolladora,
   * según su plan actualmente activo (PlanMaxProfiles).
   */
  async getAgentLimitInfo(agencyId: string) {
    const agency = await this.userModel.findById(agencyId);
    if (!agency) throw new NotFoundException('Usuario no encontrado');

    const isActive =
      agency.subscriptionStatus === 'ACTIVE' &&
      (!agency.subscription_expire || agency.subscription_expire > new Date());

    const effectiveMax = await this.getEffectiveMaxProfiles(agency);
    const current = await this.countAgentsByParent(agencyId);

    return {
      plan: agency.subscriptionPlan ?? null,
      subscriptionStatus: agency.subscriptionStatus ?? 'INACTIVE',
      max: effectiveMax,
      current,
      remaining: Math.max(effectiveMax - current, 0),
      canCreate: current < effectiveMax,
    };
  }

  /**
   * Devuelve el máximo de perfiles efectivo para un usuario:
   * prioriza customMaxProfiles si está definido, sino usa PlanMaxProfiles.
   */
  async getEffectiveMaxProfiles(user: any): Promise<number> {
    if (user.customMaxProfiles != null) {
      return user.customMaxProfiles;
    }
    return PlanMaxProfiles[user.subscriptionPlan ?? ''] ?? 0;
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

  async removeUserById(userId: string) {
    await this.userModel.findByIdAndDelete(userId);
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
