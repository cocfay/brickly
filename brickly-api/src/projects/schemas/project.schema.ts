// schemas/project.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

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

  @Prop({ type: String })
  fechaEntrega?: string;

  // URL amigable única para visualización pública
  @Prop({ type: String, required: false, unique: true, sparse: true })
  projectSlug?: string;

  // Tipo de proyecto (Casa, Apartamento, Condominio, etc.)
  @Prop()
  type?: string;

  // Modalidad (Venta / Alquiler)
  @Prop()
  mode?: string;

  // Estado situacional del proyecto (EN VENTA / PREVENTA)
  @Prop()
  situacional?: string;

  // Cantidad de unidades del proyecto
  @Prop()
  unidades?: number;

  // Precio desde en quetzales
  @Prop()
  priceFromQ?: number;

  // Tasa dólar
  @Prop()
  rate?: number;

  // Precio desde en dólares
  @Prop()
  priceFromUSD?: number;

  // Link del tour 360
  @Prop()
  tour360?: string;

  // Ubicación y entorno
  @Prop({ type: Object })
  location?: Record<string, any>;

  // Áreas y dimensiones
  @Prop({ type: Object })
  areas?: Record<string, any>;

  // Estructura
  @Prop({ type: Object })
  estructura?: Record<string, any>;

  // Amenidades (objeto de claves)
  @Prop({ type: Object })
  amenities?: Record<string, any>;

  // Modelos del proyecto (Apartamento / Bodega, con campos según tipo)
  @Prop({ type: [{ type: Object }], default: [] })
  models?: Record<string, any>[];

  // Empresa desarrolladora "Desarrollado por"
  @Prop({ type: Object })
  desarrolladora?: Record<string, any>;

  // imagen principal (opcional)
  @Prop()
  mainImage?: string;
  
  @Prop()
  mainImageAlter?: string;

  // colección de imágenes
  @Prop({ type: [String], default: [] })
  images?: string[];

  // opcional: para relacionarlo con usuario
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId?: any;

  @Prop({ default: 'draft' })
  status!: string;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);