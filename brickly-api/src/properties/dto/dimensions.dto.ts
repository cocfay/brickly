import { IsOptional, IsString, IsArray, IsNumber, IsObject, ValidateNested, Allow } from 'class-validator';

export class DimensionsDto {
    @IsOptional()
    @IsNumber()
    landM2?: number;

    @IsOptional()
    @IsNumber()
    landV2?: number;

    @IsOptional()
    @IsNumber()
    constructionM2?: number;

    @IsOptional()
    @IsNumber()
    storageM2?: number;
}