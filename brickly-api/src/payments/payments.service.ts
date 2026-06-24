import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { PlanType } from '../common/enums/plan.enum';
import { UsersService } from '../users/users.service';

@Injectable()
export class PaymentsService {
  constructor(
      private userService: UsersService,
    ) {}

  private API_URL = 'https://app.recurrente.com/api';
  //private API_URL = 'https://api.recurrente.com/v1';
  private API_KEY = 'pk_test_X7CzDknKDL4kwlWkMSR3klsBrIWrjoOGD9YEDbnYP5A15FbABb8NFYbrk';
  private SECRECT_KEY = 'sk_test_WmJ523ttrdTFWhLLkO9QTufTFCHYvYyxXPJpVodfMloHwcZ7xRG2OceDa';

  getPlanId(plan): string {
    switch (plan) {
      case 'AGENTE_BASICO':
        return PlanType.AGENTE_BASICO;
      case 'DESARROLLADORA':
        return PlanType.DESARROLLADORA;
      case 'AGENCIA':
        return 'PlanType.AGENCIA';
      case 'ARQUITECTO':
        return PlanType.ARQUITECTO;
    }
    return '';
  }

  async createFeaturedCharge(userId: string, thisId: string, amount_cents:number, title:string, type_send: string, plan: string) {
    const response = await axios.post(
      `${this.API_URL}/checkouts`,
      {
        items:[{
          name: title,
          amount_in_cents: amount_cents, // precio destacado
          //amount: Number(process.env.PRICE_FEATURED), // precio destacado
          currency: 'GTQ',
          quantity:1,
          charge_type:'one_time',
          description: 'Proceso de pago',
        }],
        metadata: {
          userId,
          thisId,
          type_send,
          plan
        
        }
      },
      {
        headers: {
          Authorization: `Bearer ${this.SECRECT_KEY}`,
          'X-PUBLIC-KEY': `${this.API_KEY}`,
          'X-SECRET-KEY': `${this.SECRECT_KEY}`,
        },
      },
    );

    return response.data;
  }

  async createSubscription(userJwt, plan: PlanType) {
    const user = await this.userService.findById(userJwt.userId);
    if (!user.recurrenteCustomerId) {
      const customer = await this.createCustomer(user);

      user.recurrenteCustomerId = customer.id;
      await user.save();
    }
    const response = await axios.post(
      `${this.API_URL}/checkouts`,
      { 
        items:[
          {
            product_id: this.getPlanId(plan),
            currency: 'GTQ'
          }, // depende de cómo tengas configurado en Recurrente
        ],
        custom_account_id: user.recurrenteCustomerId,
        metadata: {
          userId: user._id,
          plan,
          type: 'subscription'
        }
      },
      {
        headers: {
          Authorization: `Bearer ${this.SECRECT_KEY}`,
          'X-PUBLIC-KEY': `${this.API_KEY}`,
          'X-SECRET-KEY': `${this.SECRECT_KEY}`,
        },
      },
    );

    return response.data;
  }
  async createCustomer(user) {
    const response = await axios.post(
      `${this.API_URL}/customers`,
      {
        email: user.email,
        full_name: user.name,
        metadata: {
          userId: user._id
        }
      },
      {
        headers: {
          Authorization: `Bearer ${this.SECRECT_KEY}`,
          'X-PUBLIC-KEY': `${this.API_KEY}`,
          'X-SECRET-KEY': `${this.SECRECT_KEY}`,
        },
      },
    );

    return response.data;
  }
}