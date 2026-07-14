import { Controller, Post, Req, Headers, HttpCode } from '@nestjs/common';
import type { Request } from 'express';
import * as crypto from 'crypto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { UsersService } from '../users/users.service';
import { PropertiesService } from '../properties/properties.service';
import {
  PlanRoleMap,
  computeExpirationDate,
} from '../common/enums/plan.enum';

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private subService: SubscriptionsService,
    private userService: UsersService,
    private propertyService: PropertiesService,
  ) {}

  /**
   * Verifica la firma del webhook usando el esquema de Svix
   * (el prefijo `whsec_` del secret es el estándar Svix; Recurrente
   * lo usa por debajo, confirmado con los headers reales recibidos).
   */
  private verifySignature(
    rawBody: Buffer | undefined,
    headers: Record<string, string | string[] | undefined>,
  ): boolean {
    const secret = process.env.RECURRENTE_WEBHOOK_SECRET;

    if (!secret) {
      console.error('[Webhooks] ⚠️ RECURRENTE_WEBHOOK_SECRET no está configurado en .env — se rechaza el webhook por seguridad.');
      return false;
    }

    if (!rawBody) {
      console.error('[Webhooks] ⚠️ No se recibió rawBody (revisar configuración de main.ts) — no se puede verificar la firma.');
      return false;
    }

    const id = (headers['svix-id'] ?? headers['webhook-id']) as string | undefined;
    const timestamp = (headers['svix-timestamp'] ?? headers['webhook-timestamp']) as string | undefined;
    const signatureHeader = (headers['svix-signature'] ?? headers['webhook-signature']) as string | undefined;

    if (!id || !timestamp || !signatureHeader) {
      console.error(
        `[Webhooks] ⚠️ Faltan headers de firma. id=${id} timestamp=${timestamp} signature=${signatureHeader}.`,
      );
      return false;
    }

    const timestampNum = parseInt(timestamp, 10);
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Number.isNaN(timestampNum) || Math.abs(nowSeconds - timestampNum) > 300) {
      console.error(`[Webhooks] ⚠️ Timestamp fuera de rango (posible replay). recibido=${timestampNum} servidor=${nowSeconds}`);
      return false;
    }

    try {
      const secretBytes = Buffer.from(secret.split('_')[1], 'base64');
      const signedContent = `${id}.${timestamp}.${rawBody.toString('utf8')}`;
      const expectedSignature = crypto
        .createHmac('sha256', secretBytes)
        .update(signedContent)
        .digest('base64');

      const candidates = signatureHeader.split(' ');
      const isValid = candidates.some((candidate) => {
        const [, sigValue] = candidate.split(',');
        if (!sigValue) return false;
        const a = Buffer.from(sigValue);
        const b = Buffer.from(expectedSignature);
        if (a.length !== b.length) return false;
        return crypto.timingSafeEqual(a, b);
      });

      if (!isValid) {
        console.error(`[Webhooks] ⚠️ Firma inválida. esperada=${expectedSignature} recibidas=${signatureHeader}`);
      } else {
        console.log('[Webhooks] ✅ Firma verificada correctamente.');
      }

      return isValid;
    } catch (err: any) {
      console.error('[Webhooks] ⚠️ Error calculando/verificando firma ->', err?.message);
      return false;
    }
  }

  @Post('recurrente')
  @HttpCode(200)
  async handle(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const event = req.body;
    const eventType = event?.event_type;

    console.log('========================================');
    console.log(`[Webhooks] Evento recibido: ${eventType}`);
    console.log('[Webhooks] Payload completo ->', JSON.stringify(event, null, 2));

    const signatureOk = this.verifySignature(req.rawBody, headers);
    if (!signatureOk) {
      console.error(`[Webhooks] ❌ Evento ${eventType} RECHAZADO por firma inválida/ausente.`);
      return { received: true, processed: false, reason: 'invalid_signature' };
    }

    try {
      switch (eventType) {
        // 💳 Cobro exitoso (primer pago de checkout, o cobro único de "destacar").
        // El metadata que enviamos al crear el checkout llega dentro de
        // `event.checkout.metadata` (confirmado con logs reales), NO en
        // `event.metadata` (ese suele venir undefined).
        case 'payment_intent.succeeded':
        case 'intent.succeeded': {
          const meta = event.checkout?.metadata ?? event.subscription?.metadata ?? event.metadata;
          const paymentId =
            event.checkout?.id ?? event.payment_intent?.id ?? event.intentable?.id ?? event.id;
          const isRenewal = !event.checkout; // sin checkout -> cobro automático sobre una suscripción existente

          console.log(`[Webhooks:${eventType}] paymentId=${paymentId} isRenewal=${isRenewal} metadata=`, JSON.stringify(meta));

          if (!meta) {
            console.log(`[Webhooks:${eventType}] Sin metadata, se ignora (no es un checkout/suscripción generado por nosotros).`);
            break;
          }

          if (await this.subService.isEventProcessed(paymentId)) {
            console.log(`[Webhooks:${eventType}] Ya procesado antes (paymentId=${paymentId}), se ignora.`);
            break;
          }

          if (meta.type === 'subscription') {
            const { userId, plan } = meta;
            if (!userId || !plan) {
              console.error(`[Webhooks:${eventType}] ⚠️ Falta userId o plan en metadata ->`, JSON.stringify(meta));
              break;
            }

            // 🚫 Si es un checkout nuevo (no renovación), cancelar la
            // suscripción anterior en Recurrente para que el cliente no
            // quede con dos suscripciones activas facturándose.
            if (!isRenewal) {
              await this.subService.cancelRemotely(userId);
            }

            const role = PlanRoleMap[plan];
            if (!role) {
              console.error(`[Webhooks:${eventType}] ⚠️ No hay rol mapeado para el plan "${plan}" en PlanRoleMap.`);
              break;
            }

            const expiresAt = computeExpirationDate(plan);

            await this.userService.activateSubscription(userId, {
              plan,
              role,
              expiresAt,
            });

            const subUpdate: any = { userId, plan, status: 'ACTIVE' };
            if (!isRenewal) {
              // Primer pago (viene de un checkout nuevo): aún no tenemos el
              // subscription.id oficial de Recurrente; usamos el checkout.id
              // como placeholder temporal. subscription.create lo reemplazará
              // por el id real en cuanto llegue.
              subUpdate.recurrenteId = event.checkout.id;
            }
            // En una renovación NO tocamos recurrenteId, para no sobreescribir
            // el id real de la suscripción con el id de este cobro puntual.
            await this.subService.createOrUpdate(subUpdate);

            console.log(`[Webhooks:${eventType}] ✅ ${isRenewal ? 'Renovación procesada' : 'Rol asignado'} para userId=${userId}, plan=${plan}, nueva expiración=${expiresAt.toISOString()}`);
          } else if (meta.type_send === 'property') {
            await this.propertyService.activateFeatured(meta.thisId, true);
            console.log(`[Webhooks:${eventType}] ✅ Propiedad ${meta.thisId} marcada como destacada.`);
          } else if (meta.type_send === 'user') {
            const expireDate = new Date(
              new Date().setDate(new Date().getDate() + 30),
            );
            await this.userService.updateById(meta.thisId, {
              featured_user: 1,
              featured_expire: expireDate,
              planUse: meta.plan,
            } as any);
            console.log(`[Webhooks:${eventType}] ✅ Usuario ${meta.thisId} marcado como destacado hasta ${expireDate.toISOString()}.`);
          } else {
            console.log(`[Webhooks:${eventType}] metadata.type/type_send no reconocido, no se aplica ninguna acción. metadata=`, JSON.stringify(meta));
          }

          await this.subService.markEventProcessed(paymentId, eventType);
          break;
        }

        case 'payment_intent.failed':
        case 'intent.failed':
        case 'intent.canceled': {
          const meta = event.checkout?.metadata ?? event.subscription?.metadata ?? event.metadata;
          const isRenewal = !event.checkout;
          console.log(`[Webhooks:${eventType}] Cobro fallido/cancelado. isRenewal=${isRenewal} metadata=`, JSON.stringify(meta));

          // Si es un fallo de COBRO RECURRENTE de una suscripción ya activa
          // (sin checkout de por medio), degradamos de inmediato a "cliente".
          // Si es el PRIMER pago (viene de un checkout), el rol nunca se
          // había otorgado, así que no hay nada que revertir.
          if (isRenewal && meta?.type === 'subscription' && meta?.userId) {
            await this.subService.updateStatus(meta.userId, 'PAST_DUE');
            await this.userService.deactivateSubscription(meta.userId, {
              status: 'PAST_DUE',
            });
            console.log(`[Webhooks:${eventType}] ✅ Usuario userId=${meta.userId} degradado a rol "cliente" (cobro recurrente no procesado)`);
          }
          break;
        }

        // ✅ Confirmación oficial de la suscripción por parte de Recurrente.
        // Sirve para sincronizar el subscription.id real y, si viene,
        // reemplazar nuestra fecha estimada por `current_period_ends_at`.
        case 'subscription.create': {
          const sub = event.subscription;
          const meta = sub?.metadata || {};
          const { userId, plan } = meta;

          console.log(`[Webhooks:subscription.create] subId=${sub?.id} userId=${userId} plan=${plan} status=${sub?.status} current_period_ends_at=${sub?.current_period_ends_at}`);

          if (!userId || !plan) {
            console.error('[Webhooks:subscription.create] ⚠️ Falta userId o plan en subscription.metadata ->', JSON.stringify(meta));
            break;
          }

          const role = PlanRoleMap[plan];
          if (!role) {
            console.error(`[Webhooks:subscription.create] ⚠️ No hay rol mapeado para el plan "${plan}".`);
            break;
          }

          const expiresAt = sub?.current_period_ends_at
            ? new Date(sub.current_period_ends_at)
            : computeExpirationDate(plan);

          await this.userService.activateSubscription(userId, {
            plan,
            role,
            expiresAt,
          });

          await this.subService.createOrUpdate({
            userId,
            plan,
            status: 'ACTIVE',
            recurrenteId: sub.id,
          });

          console.log(`[Webhooks:subscription.create] ✅ Sincronizado. Rol="${role}" userId=${userId} expira=${expiresAt.toISOString()} recurrenteId=${sub.id}`);
          break;
        }

        // ❌ Suscripción cancelada (se dispara al 3er cobro automático fallido, o cancelación manual)
        case 'subscription.cancel': {
          const sub = event.subscription;
          const meta = sub?.metadata || {};
          const { userId, plan } = meta;

          console.log(`[Webhooks:subscription.cancel] subId=${sub?.id} userId=${userId} plan=${plan} status=${sub?.status} failure_count=${sub?.failure_count}`);

          if (!userId) {
            console.error('[Webhooks:subscription.cancel] ⚠️ Falta userId en subscription.metadata ->', JSON.stringify(meta));
            break;
          }

          // Si el usuario ya tiene un plan activo diferente, este cancel
          // corresponde a una suscripción anterior que fue reemplazada
          // por un cambio de plan — la ignoramos para no degradar al usuario.
          const currentSub = await this.subService.findActiveByUserId(userId);
          if (currentSub && currentSub.plan !== plan) {
            console.log(`[Webhooks:subscription.cancel] ⏭️ Ignorado: usuario ya tiene plan activo "${currentSub.plan}" (cancelado: "${plan}")`);
            break;
          }

          await this.subService.updateStatus(userId, 'CANCELED');

          await this.userService.deactivateSubscription(userId, {
            status: 'CANCELED',
          });

          console.log(`[Webhooks:subscription.cancel] ✅ Usuario userId=${userId} degradado a rol "cliente" (plan cancelado: ${plan})`);
          break;
        }

        // ⚠️ Aviso de cobro recurrente fallido (antes de llegar a subscription.cancel al 3er intento)
        case 'subscription.past_due': {
          const sub = event.subscription;
          const meta = sub?.metadata || {};
          const { userId } = meta;

          console.log(`[Webhooks:subscription.past_due] subId=${sub?.id} userId=${userId} failure_count=${sub?.failure_count}`);

          if (!userId) {
            console.error('[Webhooks:subscription.past_due] ⚠️ Falta userId en subscription.metadata.');
            break;
          }

          await this.subService.updateStatus(userId, 'PAST_DUE');
          // Regla de negocio actualizada: un cobro recurrente no procesado
          // degrada de inmediato al rol "cliente" (ya no se espera al 3er
          // fallo / subscription.cancel).
          await this.userService.deactivateSubscription(userId, {
            status: 'PAST_DUE',
          });
          console.log(`[Webhooks:subscription.past_due] ✅ Usuario userId=${userId} degradado a rol "cliente" (cobro recurrente no procesado)`);
          break;
        }

        case 'refund.create': {
          const originalPaymentId = event.payment?.id;
          console.log(`[Webhooks:refund.create] refundId=${event.refund?.id} paymentId=${originalPaymentId} amount=${event.amount_in_cents}`);

          if (!originalPaymentId) {
            console.error('[Webhooks:refund.create] ⚠️ No se pudo determinar el pago original (event.payment.id ausente).');
            break;
          }

          console.warn(`[Webhooks:refund.create] ⚠️ Reembolso detectado pero SIN acción automática implementada todavía (paymentId=${originalPaymentId}). Pendiente de definir junto con el usuario.`);
          break;
        }

        default: {
          console.log(`[Webhooks] Evento "${eventType}" recibido pero no manejado explícitamente.`);
          break;
        }
      }
    } catch (err: any) {
      console.error(`[Webhooks] ❌ Error procesando evento "${eventType}" ->`, err?.stack ?? err?.message);
    }

    return { received: true, processed: true };
  }
}
