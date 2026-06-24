import { IsOptional, IsString, IsArray, IsNumber, IsObject, ValidateNested, IsMongoId, Allow } from 'class-validator';
import { Type } from 'class-transformer';
import { MarketDto } from './market.dto';
import { ExpensesDto } from './expenses.dto';
import { DimensionsDto } from './dimensions.dto';
import { StructureDto } from './structure.dto';
import { LayoutDto } from './layout.dto';
export class CreatePropertyDto {

  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsOptional()
  @IsObject()
  featured?: Record<string, any>;

  @IsOptional()
  exclusive?: boolean;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  propertySlug?: string;

  @IsOptional()
  @IsArray()
  agents?: string[];

  @IsObject()
  @ValidateNested()
  @Type(() => MarketDto)
  market?: MarketDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions?: DimensionsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ExpensesDto)
  expenses?: ExpensesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StructureDto)
  structure?: StructureDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LayoutDto)
  layout?: LayoutDto;

  @IsObject()
  @Allow()
  location?: Record<string, any>;

  @IsOptional()
  @IsObject()
  @Allow()
  amenities?: Record<string, any>;

  @IsOptional()
  @IsObject()
  media?: Record<string, any>;

  @IsOptional()
  @IsObject()
  @Allow()
  extraFeatures?: Record<string, any>;

  @IsOptional()
  folderId?: string;

  @IsOptional()
  @IsObject()
  reasonRejected?: Map<string, any>;
}
