// schemas/project-lead.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProjectLeadDocument = ProjectLead & Document;

@Schema({ timestamps: true })
export class ProjectLead {
  // Referencia al proyecto (si se pudo resolver el _id)
  @Prop({ type: Types.ObjectId, ref: 'Project', required: false })
  projectId?: any;

  // Slug (o id) público con el que se abrió el proyecto
  @Prop({ required: true, index: true })
  projectSlug?: string;

  // Para solicitudes desde un modelo (página de detalle de modelo)
  @Prop()
  modelSlug?: string;

  @Prop()
  modelName?: string;

  @Prop()
  name?: string;

  @Prop()
  lastname?: string;

  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  @Prop()
  message?: string;

  @Prop({ default: 'proyecto', enum: ['proyecto', 'modelo'] })
  type?: string;

  @Prop({ default: 'pendiente', enum: ['pendiente', 'revisado'] })
  status?: string;
}

export const ProjectLeadSchema = SchemaFactory.createForClass(ProjectLead);
