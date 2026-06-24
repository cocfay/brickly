import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Partner {
  @Prop()
  logo_url!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  expire_date!: Date;

  @Prop({ index: true })
  category!: string;

  @Prop({ index: true })
  type!: string;
}

export const PartnerSchema =
  SchemaFactory.createForClass(Partner);