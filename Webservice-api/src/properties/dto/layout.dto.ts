import { IsOptional, IsString, IsArray, IsNumber, IsBoolean, IsObject, ValidateNested, Allow } from 'class-validator';

export class LayoutDto {
    @IsOptional()
    @IsNumber()
    totalRooms: number

    @IsOptional()
    @IsNumber()
    bedrooms: number

    @IsOptional()
    @IsNumber()
    bathrooms: number

    @IsOptional()
    @IsNumber()
    halfBathrooms: number

    @IsOptional()
    @IsString()
    serviceRoom: string

    @IsOptional()
    @IsBoolean()
    deck: boolean

    @IsOptional()
    @IsNumber()
    parkingSpots: number

    @IsOptional()
    @IsBoolean()
    furnished: Boolean
    
    @IsOptional()
    @IsNumber()
    floors: number

    @IsOptional()
    @IsBoolean()
    driveaway: boolean

    @IsOptional()
    @IsString()
    laundry: string

    @IsOptional()
    @IsBoolean()
    study: boolean

    @IsOptional()
    @IsString()
    familyroom: string
}