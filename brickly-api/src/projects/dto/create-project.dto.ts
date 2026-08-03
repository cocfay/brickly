// dto/create-project.dto.ts
import {
  IsString,
  IsOptional,
  IsArray,
  IsDate,
  IsNumber,
  IsObject,
} from 'class-validator';

export class CreateProjectDto {
  @IsString()
  title?: string;

  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsDate()
  date_project?: Date;

  @IsOptional()
  @IsString()
  projectSlug?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  mode?: string;

  @IsOptional()
  @IsNumber()
  priceFromQ?: number;

  @IsOptional()
  @IsNumber()
  rate?: number;

  @IsOptional()
  @IsNumber()
  priceFromUSD?: number;

  @IsOptional()
  @IsString()
  tour360?: string;

  @IsOptional()
  @IsObject()
  location?: Record<string, any>;

  @IsOptional()
  @IsObject()
  areas?: Record<string, any>;

  @IsOptional()
  @IsObject()
  estructura?: Record<string, any>;

  @IsOptional()
  @IsObject()
  amenities?: Record<string, any>;

  @IsOptional()
  @IsArray()
  models?: any[];

  @IsOptional()
  @IsString()
  mainImage?: string;

  @IsOptional()
  @IsString()
  mainImageAlter?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  images?: string[];
}
