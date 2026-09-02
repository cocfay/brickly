import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BillingCharge } from './schemas/billing-charge.schema';
import { User } from '../users/user.schema';

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
    @InjectModel(User.name) private userModel: Model<User>,
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
      const user = await this.userModel
        .findById(data.userId)
        .select('name email')
        .lean()
        .catch(() => null);

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
        userName: user?.name,
        userEmail: user?.email,
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

  /**
   * Reporte de ventas para administradores, basado en BillingCharge.
   * Devuelve: cargos individuales (con datos del usuario) y resumenes
   * agregados (totales, KPI, ventas por plan y por mes).
   */
  async salesReport(options?: { from?: string; to?: string }) {
    const query: Record<string, any> = {};
    if (options?.from || options?.to) {
      query.chargedAt = {};
      if (options.from) query.chargedAt.$gte = new Date(options.from);
      if (options.to) query.chargedAt.$lte = new Date(options.to);
    }

    const charges = await this.model.find(query).sort({ chargedAt: -1 }).lean();

    const enriched = charges.map((c) => ({
      _id: c._id,
      userId: c.userId?.toString(),
      userName: c.userName,
      userEmail: c.userEmail,
      plan: c.plan,
      description: c.description,
      amount: Number(c.amount || 0),
      currency: c.currency,
      status: c.status,
      chargedAt: c.chargedAt,
      isRenewal: !!c.isRenewal,
      paymentId: c.paymentId,
    }));

    const succeeded = enriched.filter((c) => c.status === 'SUCCEEDED');
    const failed = enriched.filter((c) => c.status === 'FAILED');

    const totalRevenue = succeeded.reduce((sum, c) => sum + c.amount, 0);
    const totalCharges = enriched.length;
    const totalSales = succeeded.length;
    const totalFailed = failed.length;
    const renewals = succeeded.filter((c) => c.isRenewal).length;
    const newSales = totalSales - renewals;

    const byPlan = new Map<string, { count: number; revenue: number }>();
    for (const c of succeeded) {
      const key = c.description || `Suscripción ${c.plan}`;
      const entry = byPlan.get(key) || { count: 0, revenue: 0 };
      entry.count += 1;
      entry.revenue += c.amount;
      byPlan.set(key, entry);
    }
    const salesByPlan = Array.from(byPlan.entries()).map(([plan, v]) => ({
      plan,
      count: v.count,
      revenue: v.revenue,
    }));

    const byMonth = new Map<string, { count: number; revenue: number }>();
    for (const c of succeeded) {
      if (!c.chargedAt) continue;
      const d = new Date(c.chargedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = byMonth.get(key) || { count: 0, revenue: 0 };
      entry.count += 1;
      entry.revenue += c.amount;
      byMonth.set(key, entry);
    }
    const salesByMonth = Array.from(byMonth.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([month, v]) => ({ month, count: v.count, revenue: v.revenue }));

    return {
      summary: {
        totalRevenue,
        totalCharges,
        totalSales,
        totalFailed,
        renewals,
        newSales,
        currency: 'GTQ',
      },
      charges: enriched,
      salesByPlan,
      salesByMonth,
    };
  }
}