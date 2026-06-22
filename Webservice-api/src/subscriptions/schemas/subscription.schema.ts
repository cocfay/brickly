import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PlanType } from '../../common/enums/plan.enum';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ enum: PlanType, required: true })
  plan: PlanType;

  @Prop({ default: 'ACTIVE' })
  status: string;

  @Prop()
  recurrenteId: string;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);