import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import mongoose from 'mongoose';

@Schema({ timestamps: true })
export class Contactsite {

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

  @Prop({ required: true, index: true })
  type!: string;

}

export const ContactsiteSchema = SchemaFactory.createForClass(Contactsite);

ContactsiteSchema.index({ type: 1 });
ContactsiteSchema.index({ email: 1 });
ContactsiteSchema.index({ createdAt: -1 });