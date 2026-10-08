import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Property, PropertySchema } from '../properties/schemas/property.schema';
import { User, UserSchema } from '../users/user.schema';
import { PhotoCleanupController } from './photo-cleanup.controller';
import { PhotoCleanupService } from './photo-cleanup.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [PhotoCleanupController],
  providers: [PhotoCleanupService],
})
export class PhotoCleanupModule {}