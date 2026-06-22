import { IsOptional, IsString, IsArray, IsNumber, IsObject, ValidateNested, Allow } from 'class-validator';

export class ExpensesDto {
    @IsOptional()
    @IsString()
    stoveType?: string;

    @IsOptional()
    @IsString()
    municipality?: string;

    @IsOptional()
    @IsString()
    waterService?: string;

    @IsOptional()
    @IsArray()
    @IsString({each : true })
    includes?: string[]; 

    @IsOptional()
    @IsObject()
    iusi?: Record<string, any>;

    @IsOptional()
    @IsNumber()
    maintenanceCost?: number;

}