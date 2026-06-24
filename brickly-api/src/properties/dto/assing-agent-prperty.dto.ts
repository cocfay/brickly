import { IsOptional, IsString, IsArray, IsNumber, IsObject, IsMongoId } from 'class-validator';
export class AssingAgentPropertyDto {

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  agents?: string[];

}