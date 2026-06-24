import { Controller, Post, Body, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { UsersService } from '../users/users.service';
import { PlanType } from '../common/enums/plan.enum';
import { AllPlanType, PlanPrices, PlanDescription  } from '../common/enums/pricecost.enum';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PropertiesService } from '../properties/properties.service';
import { Role } from '../auth/roles.enum';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly propertiesService: PropertiesService,
  ) {}

  @Post('subscribe')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  subscribe(@Req() req, @Body() body: { plan: PlanType }) {
    return this.paymentsService.createSubscription(
      req.user,
      body.plan,
    );
  }
  @Post('featured')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async featured(@Req() req, @Body() body: {type: string, id: string, plan: string }) {

    let amount_cents = 0;
    let title_featured = '';
    const plan = body.plan as AllPlanType;
    const price = PlanPrices[plan];
    amount_cents = Number(price)*100;
    if(body.type == 'property'){
      
      const propertyF = await this.propertiesService.findById(body.id);
      if (
            !propertyF 
          ) {
            throw new NotFoundException('Propiedad encontrada');
          }
          title_featured = PlanDescription[plan] + " ( " + propertyF.market.title.toString() + " ) ";
    }else if(body.type == 'user'){

      title_featured = PlanDescription[plan];
    }
    return this.paymentsService.createFeaturedCharge(
      req.user.userId,
      body.id,
      amount_cents,
      title_featured,
      body.type,
      plan
    );
  }
}