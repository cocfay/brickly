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
  private API_KEY = process.env.RECURRENTE_API_KEY || '';
  private SECRECT_KEY = process.env.RECURRENTE_SECRET_KEY || '';

  getPlanId(planKey: string): string {
    // 1. Validamos si el string recibido pertenece a las llaves (keys) del Enum
    const planKeys = Object.keys(PlanType);
    const isValidPlan = planKeys.includes(planKey);

    if (!isValidPlan) {
      console.warn(
        `[PaymentsService] Plan desconocido recibido: "${planKey}". Planes válidos: ${planKeys.join(', ')}`
      );
      return '';
    }

    // 2. Al ser una llave válida, accedemos al valor real del enum (el prod_id)
    return PlanType[planKey as keyof typeof PlanType];
  }

  async createRetryCheckout(userId: string) {
    const user = await this.userService.findById(userId);
    if (!user) throw new Error('Usuario no encontrado');

    const plan = user.subscriptionPlan as PlanType;
    if (!plan) {
      throw new Error('El usuario no tiene un plan asignado para reactivar');
    }

    // Reusa la lógica de createSubscription simulando el JWT
    return this.createSubscription({ userId }, plan);
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
      success_url: `${this.getFrontendUrl('refresh-session')}?plan=${encodeURIComponent(plan)}`,
      cancel_url: this.getFrontendUrl('precios'),
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
  /**
   * Construye una URL absoluta hacia el frontend (ej. para success_url /
   * cancel_url del checkout de Recurrente), reutilizando la misma base
   * que ya se usa para los redirects de Google login.
   */
  private getFrontendUrl(path: string): string {
    const base = process.env.LOGIN_GOOGLE_REDIR_WEB || '/';
    return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
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