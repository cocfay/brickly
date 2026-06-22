// dto/create-featured-partner.dto.ts

import {
  IsString,
  IsDateString,
} from 'class-validator';

export class CreateFeaturedPartnerDto {

  @IsString()
  logo_url!: string;

  @IsString()
  name!: string;

  @IsDateString()
  expire_date!: Date;
}