// featured-partners.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Partner,
  PartnerSchema,
} from './schemas/partner.schema';

import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';
import { User,UserSchema } from '../users/user.schema';


@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Partner.name,
        schema: PartnerSchema,
      },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [PartnersController],
  providers: [PartnersService],
  exports: [PartnersService],
})
export class PartnersModule {}