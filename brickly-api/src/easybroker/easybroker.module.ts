import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { EasybrokerController } from './easybroker.controller';
import { EasybrokerService } from './easybroker.service';

import { Property, PropertySchema } from '../properties/schemas/property.schema';
import { User, UserSchema } from '../users/user.schema';

import { FileuploadsModule } from '../fileuploads/fileuploads.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Property.name,
        schema: PropertySchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
     FileuploadsModule,
  ],
  controllers: [EasybrokerController],
  providers: [EasybrokerService],
  exports: [EasybrokerService],
})
export class EasybrokerModule {}