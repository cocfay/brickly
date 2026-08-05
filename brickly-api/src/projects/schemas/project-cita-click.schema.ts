// schemas/project-cita-click.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProjectCitaClickDocument = ProjectCitaClick & Document;

@Schema({ timestamps: true })
export class ProjectCitaClick {
  // Referencia al proyecto (si se pudo resolver el _id)
  @Prop({ type: Types.ObjectId, ref: 'Project', required: false })
  projectId?: any;

  // Slug (o id) público con el que se abrió el proyecto
  @Prop({ required: true, index: true })
  projectSlug?: string;

  // Para clics desde un modelo (página de detalle de modelo)
  @Prop()
  modelSlug?: string;

  // Fecha/hora del clic en "agendar cita"
  @Prop({ default: Date.now })
  clickedAt?: Date;
}

export const ProjectCitaClickSchema = SchemaFactory.createForClass(ProjectCitaClick);
