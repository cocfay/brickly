import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import mongoose from 'mongoose';

@Schema({ timestamps: true })
export class Leadform {

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  agentId!: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Types.ObjectId, ref: 'User' })
  clientId!: mongoose.Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true })
  email!: string;

  @Prop()
  name!: string;

  @Prop()
  lastname!: string;

  @Prop()
  message!: string;

  @Prop()
  phone!: string;

  @Prop({ index: true })
  info!: string;

  @Prop({ required: true, index: true })
  type!: string;

}

export const LeadformSchema = SchemaFactory.createForClass(Leadform);

LeadformSchema.index({ agentId: 1 });
LeadformSchema.index({ createdAt: -1 });