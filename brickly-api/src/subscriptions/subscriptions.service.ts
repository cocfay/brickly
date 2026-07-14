import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Subscription } from './schemas/subscription.schema';
import { WebhookEvent } from './schemas/webhook-event.schema';
import { Model } from 'mongoose';
import axios from 'axios';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectModel(Subscription.name)
    private model: Model<Subscription>,
    @InjectModel(WebhookEvent.name)
    private webhookEventModel: Model<WebhookEvent>,
  ) {}

  async createOrUpdate(data: Partial<Subscription>) {
    this.logger.log(
      `createOrUpdate subscription -> userId=${data.userId} plan=${data.plan} status=${data.status} recurrenteId=${data.recurrenteId}`,
    );
    return this.model.findOneAndUpdate(
      { userId: data.userId },
      data,
      { upsert: true, new: true },
    );
  }

  async updateStatus(userId: string, status: string) {
    this.logger.log(`updateStatus -> userId=${userId} status=${status}`);
    return this.model.updateOne({ userId }, { status });
  }

  /**
   * Chequea idempotencia contra la colección de Subscription
   * (para eventos subscription.create / subscription.cancel).
   */
  async alreadyProcessed(recurrenteId: string) {
    const found = await this.model.findOne({ recurrenteId });
    return !!found;
  }

  /**
   * Chequea idempotencia contra la colección genérica de eventos
   * (para pagos únicos: payment_intent.succeeded / intent.succeeded, refund.create, etc.)
   */
  async isEventProcessed(eventId: string) {
    if (!eventId) return false;
    const found = await this.webhookEventModel.findOne({ eventId });
    return !!found;
  }

  async markEventProcessed(eventId: string, eventType: string) {
    if (!eventId) return;
    try {
      await this.webhookEventModel.create({ eventId, eventType });
    } catch (err: any) {
      // código 11000 = duplicate key (ya estaba marcado, es válido en reintentos)
      if (err?.code !== 11000) {
        this.logger.error(
          `Error marcando evento ${eventId} como procesado: ${err?.message}`,
        );
      }
    }
  }

  private getApiUrl(): string {
    return process.env.RECURRENTE_API_URL || 'https://app.recurrente.com/api';
  }

  private getSecretKey(): string {
    return process.env.RECURRENTE_SECRET_KEY || '';
  }

  async findActiveByUserId(userId: string): Promise<Subscription | null> {
    return this.model.findOne({ userId, status: 'ACTIVE' });
  }

  /**
   * Cancela la suscripción activa en Recurrente (remotamente).
   * Se usa antes de activar un nuevo plan para que el cliente
   * no quede con dos suscripciones activas.
   */
  async cancelRemotely(userId: string): Promise<boolean> {
    const activeSub = await this.findActiveByUserId(userId);
    if (!activeSub?.recurrenteId) {
      this.logger.log(`cancelRemotely: No hay suscripcion activa remota para userId=${userId}`);
      return false;
    }

    const recurrenteId = activeSub.recurrenteId;

    // Si el ID es de checkout (ch_...) no se puede cancelar como suscripción;
    // solo lo marcamos como cancelado en local. El subscription.id real
    // llegará después via subscription.create y se usará en futuros cambios.
    if (recurrenteId.startsWith('ch_')) {
      this.logger.warn(`cancelRemotely: ID "${recurrenteId}" es un checkout, no una suscripción. Solo se cancela en local.`);
      await this.updateStatus(userId, 'CANCELED');
      return false;
    }

    const url = `${this.getApiUrl()}/subscriptions/${recurrenteId}`;
    const secretKey = this.getSecretKey();

    if (!secretKey) {
      this.logger.error('cancelRemotely: RECURRENTE_SECRET_KEY no configurada');
      return false;
    }

    try {
      await axios.delete(url, {
        headers: { 'X-SECRET-KEY': secretKey },
      });
      this.logger.log(`✅ Suscripción remota ${recurrenteId} cancelada para userId=${userId}`);

      await this.updateStatus(userId, 'CANCELED');
      return true;
    } catch (err: any) {
      this.logger.error(
        `❌ Error cancelando suscripción remota ${recurrenteId} para userId=${userId}: ${err?.response?.data?.message ?? err?.message}`,
      );
      return false;
    }
  }
}
