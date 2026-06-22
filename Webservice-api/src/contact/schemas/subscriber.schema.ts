import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Subscriber {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;
}

export const SubscriberSchema = SchemaFactory.createForClass(Subscriber);