import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Subscriber, SubscriberSchema } from './schemas/subscriber.schema';
import { Leadform, LeadformSchema } from './schemas/leadform.schema';
import { Contactsite, ContactsiteSchema } from './schemas/contactsite.schema';

import {
  User,
  UserSchema,
} from '../users/user.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: Subscriber.name, schema: SubscriberSchema },
      { name: Leadform.name, schema: LeadformSchema },
      { name: Contactsite.name, schema: ContactsiteSchema },
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],
  controllers: [ContactController],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactModule {}