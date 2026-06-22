import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { FileuploadsModule } from './fileuploads/fileuploads.module';
import { PropertiesModule } from './properties/properties.module';
import { PaymentsModule } from './payments/payments.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ReviewsModule } from './reviews/reviews.module'
import { ContactModule } from './contact/contact.module'
import { ProjectsModule } from './projects/projects.module'
import { PartnersModule } from './partners/partners.module'
import { EasybrokerModule } from './easybroker/easybroker.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGO_URI!),
    UsersModule,
    AuthModule,
    FileuploadsModule,
    PropertiesModule,
    PaymentsModule,
    WebhooksModule,
    ReviewsModule,
    ContactModule,
    ProjectsModule,
    PartnersModule,
    EasybrokerModule
  ],
})
export class AppModule {}