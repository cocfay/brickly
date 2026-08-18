import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { UsersModule } from '../users/users.module';
import { PropertiesModule } from '../properties/properties.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    SubscriptionsModule,
    UsersModule,
    PropertiesModule,
    BillingModule,
  ],
  controllers: [WebhooksController],
})
export class WebhooksModule {}