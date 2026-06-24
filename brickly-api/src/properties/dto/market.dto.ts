import { IsOptional, IsString, IsArray, IsNumber, IsObject, IsBoolean, ValidateNested, Allow } from 'class-validator';

export class MarketDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsNumber()
    price?: number;

    @IsOptional()
    @IsNumber()
    priceUSD?: number;

    @IsOptional()
    @IsNumber()
    exchangeRate?: number;

    @IsOptional()
    @IsString()
    operationType?: string; 

    @IsOptional()
    @IsString()
    propertyType?: string; 

    @IsOptional()
    @IsNumber()
    pricePerM2?: number;

    @IsOptional()
    @IsNumber()
    priceM2USD?: number;

    @IsOptional()
    @IsString()
    type?: String;

    @IsOptional()
    @IsString()
    mode?: String;

    @IsOptional()
    @IsBoolean()
    showprice?: boolean
}