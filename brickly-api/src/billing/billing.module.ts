import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  BillingCharge,
  BillingChargeSchema,
} from './schemas/billing-charge.schema';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: BillingCharge.name,
        schema: BillingChargeSchema,
      },
    ]),
  ],
  providers: [BillingService],
  controllers: [BillingController],
  exports: [BillingService],
})
export class BillingModule {}