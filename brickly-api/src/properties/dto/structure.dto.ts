import { IsOptional, IsString, IsArray, IsNumber, IsObject, IsBoolean, ValidateNested, Allow } from 'class-validator';

export class StructureDto {
    @IsOptional()
    @IsNumber()
    constructionYear?: number;

    @IsOptional()
    @IsNumber()
    remodelYear?: number;

    @IsOptional()
    @IsNumber()
    levels?: number;

    @IsOptional()
    @IsNumber()
    ceilingHeight?: number;

    @IsOptional()
    @IsBoolean()
    perimeterWall?: boolean;
}