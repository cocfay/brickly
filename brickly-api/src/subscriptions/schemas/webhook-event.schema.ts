import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * Registro de eventos de webhook ya procesados, usado para deduplicar
 * (Recurrente puede reintentar la entrega de un mismo evento, y algunos
 * flujos de pago único no tienen otra colección natural donde chequear
 * idempotencia como sí la tiene `Subscription`).
 */
@Schema({ timestamps: true })
export class WebhookEvent {
  @Prop({ required: true, unique: true })
  eventId: string;

  @Prop()
  eventType: string;
}

export const WebhookEventSchema = SchemaFactory.createForClass(WebhookEvent);
