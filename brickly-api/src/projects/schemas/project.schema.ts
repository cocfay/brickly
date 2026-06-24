// schemas/project.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProjectDocument = Project & Document;

@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true })
  title?: string;

  @Prop({ required: true })
  description?: string;

  @Prop()
  shortDescription?: string;

  @Prop()
  address?: string;

  @Prop()
  date_project?: Date;

  // imagen principal (opcional)
  @Prop()
  mainImage?: string;
  
  @Prop()
  mainImageAlter?: string;

  // colección de imágenes
  @Prop({ type: [String], default: [] })
  images?: string[];

  // opcional: para relacionarlo con usuario
  @Prop({ required: true })
  userId?: string;

  @Prop({ default: 'draft' })
  status!: string;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);