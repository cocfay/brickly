import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
@Schema({ timestamps: true })
export class Review {

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  agentId!: Types.ObjectId; // 👈 a quién califican

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reviewerId!: Types.ObjectId; // 👈 quién califica

  @Prop({ required: true, min: 1, max: 5 })
  rating!: number; // ⭐ 1 a 5

  @Prop()
  comment!: string;

  @Prop({ default: true })
  isVisible!: boolean;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

ReviewSchema.index({ agentId: 1, reviewerId: 1 }, { unique: true });