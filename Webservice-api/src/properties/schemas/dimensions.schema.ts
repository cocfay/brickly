import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
@Schema({ _id: false })
export class Dimensions {
  @Prop()
  landM2: number;

  @Prop()
  landV2: number;

  @Prop()
  constructionM2: number;

  @Prop()
  storageM2: number;
}

export const DimensionsSchema = SchemaFactory.createForClass(Dimensions);