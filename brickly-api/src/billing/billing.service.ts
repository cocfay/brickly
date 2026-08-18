import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BillingCharge } from './schemas/billing-charge.schema';

/**
 * Nombres legibles y precios (en GTQ) de los planes de suscripción.
 * Se usan como respaldo para el historial de cobros cuando el payload
 * del webhook no trae el monto, y para construir descripciones legibles.
 */
const PlanDisplayName: Record<string, string> = {
  BROKER_MENSUAL: 'Suscripción AGENTE INDIVIDUAL',
  BROKER_ANUAL: 'Suscripción AGENTE INDIVIDUAL',
  AGENCIA_SILVER: 'Suscripción AGENCIA SILVER',
  AGENCIA_SILVER_A: 'Suscripción AGENCIA SILVER',
  AGENCIA_GOLD: 'Suscripción AGENCIA GOLD',
  AGENCIA_GOLD6: 'Suscripción AGENCIA GOLD',
  AGENCIA_GOLD7: 'Suscripción AGENCIA GOLD',
  AGENCIA_GOLD8: 'Suscripción AGENCIA GOLD',
  AGENCIA_GOLD9: 'Suscripción AGENCIA GOLD',
  AGENCIA_GOLD_A: 'Suscripción AGENCIA GOLD',
  AGENCIA_GOLD6_A: 'Suscripción AGENCIA GOLD',
  AGENCIA_GOLD7_A: 'Suscripción AGENCIA GOLD',
  AGENCIA_GOLD8_A: 'Suscripción AGENCIA GOLD',
  AGENCIA_GOLD9_A: 'Suscripción AGENCIA GOLD',
  AGENCIA_DIAMOND: 'Suscripción AGENCIA DIAMOND',
  AGENCIA_DIAMOND_A: 'Suscripción AGENCIA DIAMOND',
};

const PlanAmount: Record<string, number> = {
  BROKER_MENSUAL: 420,
  BROKER_ANUAL: 4200,
  AGENCIA_SILVER: 420,
  AGENCIA_SILVER_A: 4200,
  AGENCIA_GOLD: 650,
  AGENCIA_GOLD6: 725,
  AGENCIA_GOLD7: 800,
  AGENCIA_GOLD8: 875,
  AGENCIA_GOLD9: 950,
  AGENCIA_GOLD_A: 6500,
  AGENCIA_GOLD6_A: 6575,
  AGENCIA_GOLD7_A: 6650,
  AGENCIA_GOLD8_A: 6725,
  AGENCIA_GOLD9_A: 6800,
  AGENCIA_DIAMOND: 1050,
  AGENCIA_DIAMOND_A: 10500,
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectModel(BillingCharge.name) private model: Model<BillingCharge>,
  ) {}

  getPlanLabel(plan?: string): string {
    if (!plan) return 'Suscripción';
    return PlanDisplayName[plan] ?? `Suscripción ${plan}`;
  }

  getPlanAmount(plan: string): number | undefined {
    return PlanAmount[plan];
  }

  async registerCharge(data: {
    userId: string;
    plan?: string;
    amount?: number;
    paymentId?: string;
    status: string;
    isRenewal?: boolean;
    chargedAt?: Date;
  }) {
    const amount =
      data.amount && data.amount > 0
        ? data.amount
        : data.plan
          ? this.getPlanAmount(data.plan) ?? 0
          : 0;

    try {
      const charge = await this.model.create({
        userId: new Types.ObjectId(data.userId),
        plan: data.plan,
        description: this.getPlanLabel(data.plan),
        amount,
        currency: 'GTQ',
        status: data.status,
        chargedAt: data.chargedAt ?? new Date(),
        paymentId: data.paymentId,
        isRenewal: data.isRenewal ?? false,
      });
      this.logger.log(
        `Cobro registrado userId=${data.userId} plan=${data.plan} monto=${amount} status=${data.status}`,
      );
      return charge;
    } catch (err: any) {
      // Duplicado (paymentId repetido) u otro error no deben romper el webhook
      this.logger.warn(
        `No se pudo registrar el cobro (paymentId=${data.paymentId}): ${err?.code === 11000 ? 'duplicado' : err?.message}`,
      );
      return null;
    }
  }

  findByUser(userId: string) {
    return this.model
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ chargedAt: -1 })
      .lean();
  }
}