import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
@Schema({ _id: false })
export class Structure {
  @Prop()
  constructionYear: number;

  @Prop()
  remodelYear: number;

  @Prop()
  levels: number;

  @Prop()
  ceilingHeight: number;

  @Prop()
  perimeterWall: boolean;
}

export const StructureSchema = SchemaFactory.createForClass(Structure);