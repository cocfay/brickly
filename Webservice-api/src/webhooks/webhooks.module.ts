import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { UsersModule } from '../users/users.module';
import { PropertiesModule } from '../properties/properties.module';

@Module({
  imports: [
    SubscriptionsModule, 
    UsersModule,
    PropertiesModule,
  ],
  controllers: [WebhooksController],
})
export class WebhooksModule {}