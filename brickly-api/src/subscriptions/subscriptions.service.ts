import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Subscription } from './schemas/subscription.schema';
import { WebhookEvent } from './schemas/webhook-event.schema';
import { Model } from 'mongoose';

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
}
