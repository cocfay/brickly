import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

/**
 * Registro de cada cobro (pago o intento de pago) de una suscripción.
 * Se alimenta desde los webhooks de Recurrente y se expone al usuario
 * en la vista de Cuenta / Facturación del cpanel.
 */
@Schema({ timestamps: true })
export class BillingCharge {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop()
  plan: string;

  @Prop()
  description: string;

  @Prop({ default: 0 })
  amount: number;

  @Prop({ default: 'GTQ' })
  currency: string;

  @Prop({ default: 'SUCCEEDED' })
  status: string; // SUCCEEDED | FAILED | PENDING

  @Prop()
  chargedAt: Date;

  @Prop({ unique: true, sparse: true })
  paymentId: string;

  @Prop({ default: false })
  isRenewal: boolean;
}

export const BillingChargeSchema = SchemaFactory.createForClass(BillingCharge);