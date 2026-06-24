// dto/create-project.dto.ts
import { IsString, IsOptional, IsArray, IsDate } from 'class-validator';

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