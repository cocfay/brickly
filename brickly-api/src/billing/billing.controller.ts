import { Controller, Get, Req, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { BillingService } from './billing.service';

@Controller('billing')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('charges')
  getCharges(@Req() req) {
    return this.billingService.findByUser(req.user.userId);
  }

  @Get('report/sales')
  @Roles(Role.ADMIN)
  getSalesReport(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.billingService.salesReport({ from, to });
  }
}