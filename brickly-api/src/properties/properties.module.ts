import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { Property, PropertySchema } from './schemas/property.schema';
import { FileuploadsModule } from '../fileuploads/fileuploads.module';
import { User,UserSchema } from '../users/user.schema';
import { ContactModule } from '../contact/contact.module';
import { ActivityLogsModule } from '../activitylogs/activitylogs.module';


@Module({
  imports: [
    ContactModule,
    ActivityLogsModule,
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema },
      { name: User.name, schema: UserSchema },
    ]),
    FileuploadsModule,
  ],
  controllers: [PropertiesController],
  providers: [PropertiesService],
  exports: [PropertiesService],
})
export class PropertiesModule {}