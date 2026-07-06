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

  // El valor del enum PlanType YA ES el product_id real de Recurrente
  // (ej. BROKER_MENSUAL = 'prod_dr9boirb'), así que solo hace falta
  // validar que el plan recibido exista en el enum actual.
  getPlanId(plan: string): string {
    const isValidPlan = Object.values(PlanType).includes(plan as PlanType);
    if (!isValidPlan) {
      console.warn(`[PaymentsService] Plan desconocido recibido: "${plan}". Planes válidos: ${Object.values(PlanType).join(', ')}`);
      return '';
    }
    return plan;
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

    const productId = this.getPlanId(plan);
    if (!productId) {
      console.error(`[PaymentsService.createSubscription] Plan inválido: "${plan}" para userId=${userJwt.userId}`);
      throw new Error(`Plan inválido: ${plan}`);
    }

    if (!user.recurrenteCustomerId) {
      const customer = await this.createCustomer(user);

      user.recurrenteCustomerId = customer.id;
      await user.save();
    }

    const body = {
      items: [
        {
          product_id: productId,
          currency: 'GTQ',
        }, // depende de cómo tengas configurado en Recurrente
      ],
      custom_account_id: user.recurrenteCustomerId,
      metadata: {
        userId: String(user._id),
        plan,
        type: 'subscription',
      },
    };

    console.log('[PaymentsService.createSubscription] Request a Recurrente ->', JSON.stringify(body, null, 2));

    try {
      const response = await axios.post(`${this.API_URL}/checkouts`, body, {
        headers: {
          Authorization: `Bearer ${this.SECRECT_KEY}`,
          'X-PUBLIC-KEY': `${this.API_KEY}`,
          'X-SECRET-KEY': `${this.SECRECT_KEY}`,
        },
      });

      console.log('[PaymentsService.createSubscription] Respuesta de Recurrente ->', JSON.stringify(response.data, null, 2));

      return response.data;
    } catch (err: any) {
      console.error('[PaymentsService.createSubscription] Error al crear checkout ->', JSON.stringify(err?.response?.data ?? err?.message, null, 2));
      throw err;
    }
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