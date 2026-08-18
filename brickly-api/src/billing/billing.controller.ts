import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BillingService } from './billing.service';

@Controller('billing')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('charges')
  getCharges(@Req() req) {
    return this.billingService.findByUser(req.user.userId);
  }
}