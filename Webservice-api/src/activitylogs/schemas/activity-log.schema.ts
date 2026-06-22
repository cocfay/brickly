import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

export type ActivityLogDocument = HydratedDocument<ActivityLog>;

@Schema({
  timestamps: true,
})
export class ActivityLog {

  @Prop({
    required: true,
  })
  type!: string;

  @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
        required: false,
    })
  propertyId?: mongoose.Types.ObjectId;

  @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
    })
  userId?: mongoose.Types.ObjectId;

  @Prop({
    required: true,
  })
  action!: string;
}

export const ActivityLogSchema =
  SchemaFactory.createForClass(ActivityLog);

ActivityLogSchema.index({
  propertyId: 1,
  action: 1,
  createdAt: -1,
});

ActivityLogSchema.index({
  userId: 1,
  action: 1,
  createdAt: -1,
});