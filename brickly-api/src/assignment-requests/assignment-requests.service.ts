import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AssignmentRequest } from './schemas/assignment-request.schema';
import { Property } from '../properties/schemas/property.schema';
import { User } from '../users/user.schema';
import { Role } from '../auth/roles.enum';

@Injectable()
export class AssignmentRequestsService {
  constructor(
    @InjectModel(AssignmentRequest.name)
    private assignmentRequestModel: Model<AssignmentRequest>,
    @InjectModel(Property.name)
    private propertyModel: Model<Property>,
    @InjectModel(User.name)
    private userModel: Model<User>,
  ) {}

  async checkEligibility(propertyId: string, userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (!user.roles?.includes(Role.AGENTE)) {
      return { eligible: false, reason: 'No tienes rol de agente' };
    }

    if (!user.parentId) {
      return { eligible: false, reason: 'No perteneces a una agencia' };
    }

    const property = await this.propertyModel.findById(propertyId);
    if (!property) throw new NotFoundException('Propiedad no encontrada');

    const userObjId = new Types.ObjectId(userId);
    const agencyObjId = user.parentId;

    if (property.userId.equals(userObjId)) {
      return { eligible: false, reason: 'Ya eres el propietario de esta propiedad' };
    }

    if (property.agents?.some(a => a.toString() === userId)) {
      return { eligible: false, reason: 'Ya estás asignado a esta propiedad' };
    }

    const belongsToAgency =
      property.userId.equals(agencyObjId) ||
      (await this.userModel.exists({
        _id: property.userId,
        parentId: agencyObjId,
      }));

    if (!belongsToAgency) {
      return { eligible: false, reason: 'La propiedad no pertenece a tu agencia' };
    }

    const existingRequest = await this.assignmentRequestModel.findOne({
      propertyId: new Types.ObjectId(propertyId),
      agentId: userObjId,
      status: 'pending',
    });

    if (existingRequest) {
      return { eligible: false, reason: 'Ya tienes una solicitud pendiente para esta propiedad' };
    }

    return { eligible: true };
  }

  async create(propertyId: string, userId: string) {
    const eligibility = await this.checkEligibility(propertyId, userId);
    if (!eligibility.eligible) {
      throw new BadRequestException(eligibility.reason);
    }

    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const existing = await this.assignmentRequestModel.findOne({
      propertyId: new Types.ObjectId(propertyId),
      agentId: new Types.ObjectId(userId),
      status: 'pending',
    });

    if (existing) {
      throw new BadRequestException('Ya tienes una solicitud pendiente para esta propiedad');
    }

    const request = await this.assignmentRequestModel.create({
      propertyId: new Types.ObjectId(propertyId),
      agentId: new Types.ObjectId(userId),
      agencyId: user.parentId,
    });

    return { success: true, data: request };
  }

  async findByAgency(agencyId: string) {
    return this.assignmentRequestModel
      .find({ agencyId: new Types.ObjectId(agencyId) })
      .sort({ createdAt: -1 })
      .populate('propertyId', 'market.title media.photos')
      .populate('agentId', 'name email avatar phone');
  }

  async approve(requestId: string, agencyId: string) {
    const request = await this.assignmentRequestModel.findById(requestId);
    if (!request) throw new NotFoundException('Solicitud no encontrada');

    if (!request.agencyId.equals(new Types.ObjectId(agencyId))) {
      throw new ForbiddenException('No tienes permiso para aprobar esta solicitud');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('La solicitud ya fue procesada');
    }

    const property = await this.propertyModel.findById(request.propertyId);
    if (!property) throw new NotFoundException('Propiedad no encontrada');

    const agentObjId = request.agentId;
    if (!property.agents?.some(a => a.toString() === agentObjId.toString())) {
      await this.propertyModel.findByIdAndUpdate(request.propertyId, {
        $addToSet: { agents: agentObjId.toString() },
      });
    }

    request.status = 'approved';
    await request.save();

    return { success: true, data: request };
  }

  async reject(requestId: string, agencyId: string, reason?: string) {
    const request = await this.assignmentRequestModel.findById(requestId);
    if (!request) throw new NotFoundException('Solicitud no encontrada');

    if (!request.agencyId.equals(new Types.ObjectId(agencyId))) {
      throw new ForbiddenException('No tienes permiso para rechazar esta solicitud');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('La solicitud ya fue procesada');
    }

    request.status = 'rejected';
    request.rejectionReason = reason || '';
    await request.save();

    return { success: true, data: request };
  }
}
