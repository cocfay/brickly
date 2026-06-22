import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
@Schema({ _id: false })
export class MediaFile {
  @Prop()
  path: string;

  @Prop({ default: false })
  isMain: boolean;
}

export const MediaFileSchema = SchemaFactory.createForClass(MediaFile);

@Schema({ _id: false })
export class Media {
  @Prop()
  description: string;

  @Prop({ type: [MediaFileSchema] })
  photos: MediaFile[];

  @Prop({ type: [MediaFileSchema] })
  videos: MediaFile[];

  @Prop({ type: [MediaFileSchema] })
  tour360: MediaFile[];
}

export const MediaSchema = SchemaFactory.createForClass(Media);