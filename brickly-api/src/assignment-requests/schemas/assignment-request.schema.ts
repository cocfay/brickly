import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Types } from 'mongoose';

@Schema({ timestamps: true })
export class AssignmentRequest {
  @Prop({ type: Types.ObjectId, ref: 'Property', required: true })
  propertyId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  agentId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  agencyId!: Types.ObjectId;

  @Prop({ enum: ['pending', 'approved', 'rejected'], default: 'pending' })
  status!: string;

  @Prop()
  rejectionReason?: string;
}

export const AssignmentRequestSchema = SchemaFactory.createForClass(AssignmentRequest);

AssignmentRequestSchema.index({ agentId: 1, status: 1 });
AssignmentRequestSchema.index({ agencyId: 1, status: 1 });
AssignmentRequestSchema.index({ propertyId: 1, agentId: 1 });
