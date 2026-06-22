import { IsOptional, IsString, IsArray, IsObject, IsBoolean, IsEmail, IsDate, IsNumber } from 'class-validator';
import { Role } from '../../auth/roles.enum';
import {  Type } from 'class-transformer';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsArray()
  roles?: Role[];

  @IsOptional()
  @IsString()
  avatar?: string;
  
  @IsOptional()
  @IsObject()
  personalInfo?: Map<string, any>;

  @IsOptional()
  @IsObject()
  agentInfo?: Map<string, any>;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  featured_user?: number;

  @Type( ()=> Date )
  @IsOptional()
  @IsDate()
  featured_expire?:Date
  
}