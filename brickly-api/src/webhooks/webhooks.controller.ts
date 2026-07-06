import { Controller, Post, Req, Headers, HttpCode } from '@nestjs/common';
import type { Request } from 'express';
import * as crypto from 'crypto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { UsersService } from '../users/users.service';
import { PropertiesService } from '../properties/properties.service';
import { PlanRoleMap } from '../common/enums/plan.enum';

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
   * parece usarlo por debajo). Headers esperados: `svix-id` /
   * `webhook-id`, `svix-timestamp` / `webhook-timestamp`,
   * `svix-signature` / `webhook-signature`.
   *
   * Devuelve `true`/`false`. Además deja logs detallados para poder
   * ajustar el esquema si Recurrente usa un formato distinto.
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

    console.log('[Webhooks] Headers recibidos ->', JSON.stringify(headers, null, 2));

    if (!id || !timestamp || !signatureHeader) {
      console.error(
        `[Webhooks] ⚠️ Faltan headers de firma. id=${id} timestamp=${timestamp} signature=${signatureHeader}. ` +
        `Si Recurrente usa nombres de header distintos, cópialos de este log y avísame para ajustar el código.`,
      );
      return false;
    }

    // Protección anti-replay: rechaza timestamps con más de 5 min de diferencia
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
        console.error(
          `[Webhooks] ⚠️ Firma inválida. esperada=${expectedSignature} recibidas=${signatureHeader}`,
        );
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
      // Respondemos 200 igualmente para que Recurrente no reintente
      // indefinidamente un ataque, pero NO procesamos el evento.
      return { received: true, processed: false, reason: 'invalid_signature' };
    }

    try {
      switch (eventType) {
        // ✅ Suscripción creada (primer cobro exitoso de un producto recurrente)
        case 'subscription.create': {
          const sub = event.subscription;
          const meta = sub?.metadata || {};
          const { userId, plan } = meta;

          console.log(`[Webhooks:subscription.create] subId=${sub?.id} userId=${userId} plan=${plan} status=${sub?.status}`);

          if (!userId || !plan) {
            console.error('[Webhooks:subscription.create] ⚠️ Falta userId o plan en subscription.metadata. metadata recibida ->', JSON.stringify(meta));
            break;
          }

          if (await this.subService.alreadyProcessed(sub.id)) {
            console.log(`[Webhooks:subscription.create] Ya procesado antes (recurrenteId=${sub.id}), se ignora.`);
            break;
          }

          await this.subService.createOrUpdate({
            userId,
            plan,
            status: 'ACTIVE',
            recurrenteId: sub.id,
          });

          const role = PlanRoleMap[plan];
          if (!role) {
            console.error(`[Webhooks:subscription.create] ⚠️ No hay rol mapeado para el plan "${plan}" en PlanRoleMap.`);
            break;
          }

          await this.userService.addRole(userId, role);
          console.log(`[Webhooks:subscription.create] ✅ Rol "${role}" asignado a userId=${userId}`);
          break;
        }

        // ❌ Suscripción cancelada (se dispara al 3er cobro automático fallido, o cancelación manual)
        case 'subscription.cancel': {
          const sub = event.subscription;
          const meta = sub?.metadata || {};
          const { userId, plan } = meta;

          console.log(`[Webhooks:subscription.cancel] subId=${sub?.id} userId=${userId} plan=${plan} status=${sub?.status} failure_count=${sub?.failure_count}`);

          if (!userId) {
            console.error('[Webhooks:subscription.cancel] ⚠️ Falta userId en subscription.metadata. metadata recibida ->', JSON.stringify(meta));
            break;
          }

          await this.subService.updateStatus(userId, 'CANCELED');

          const role = PlanRoleMap[plan];
          if (!role) {
            console.error(`[Webhooks:subscription.cancel] ⚠️ No hay rol mapeado para el plan "${plan}", no se remueve ningún rol.`);
            break;
          }

          await this.userService.removeRole(userId, role);
          console.log(`[Webhooks:subscription.cancel] ✅ Rol "${role}" removido de userId=${userId}`);
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
          // Decisión de negocio: por defecto NO se quita el rol todavía,
          // se espera a subscription.cancel (3er fallo). Si se prefiere
          // ser estricto desde el primer fallo, descomentar:
          //
          // const role = PlanRoleMap[meta.plan];
          // if (role) await this.userService.removeRole(userId, role);
          break;
        }

        // 💳 Cobro único exitoso (usado hoy para "destacar" propiedad/usuario)
        case 'payment_intent.succeeded':
        case 'intent.succeeded': {
          const meta = event.metadata;
          const paymentId =
            event.payment_intent?.id ?? event.intentable?.id ?? event.id;

          console.log(`[Webhooks:${eventType}] paymentId=${paymentId} metadata=`, JSON.stringify(meta));

          if (!meta) {
            console.log(`[Webhooks:${eventType}] Sin metadata (probablemente no es un cobro de "destacar"), se ignora.`);
            break;
          }

          if (await this.subService.isEventProcessed(paymentId)) {
            console.log(`[Webhooks:${eventType}] Ya procesado antes (paymentId=${paymentId}), se ignora.`);
            break;
          }

          if (meta.type_send === 'property') {
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
            console.log(`[Webhooks:${eventType}] type_send="${meta.type_send}" no reconocido, no se aplica ninguna acción.`);
          }

          await this.subService.markEventProcessed(paymentId, eventType);
          break;
        }

        case 'payment_intent.failed':
        case 'intent.failed':
        case 'intent.canceled': {
          console.log(`[Webhooks:${eventType}] Cobro único fallido/cancelado. metadata=`, JSON.stringify(event.metadata));
          // No se había otorgado rol/featured todavía en un cobro único,
          // así que normalmente no hay nada que revertir aquí.
          break;
        }

        case 'refund.create': {
          const originalPaymentId = event.payment?.id;
          console.log(`[Webhooks:refund.create] refundId=${event.refund?.id} paymentId=${originalPaymentId} amount=${event.amount_in_cents}`);

          if (!originalPaymentId) {
            console.error('[Webhooks:refund.create] ⚠️ No se pudo determinar el pago original (event.payment.id ausente).');
            break;
          }

          // TODO: este payload no trae `metadata` propia del pago original.
          // Para poder revertir el rol/featured correspondiente hace falta
          // buscar en tu propia base de datos qué se otorgó cuando el pago
          // fue exitoso, usando `originalPaymentId` (o el `recurrenteId`
          // de una suscripción). Por ahora solo se deja el log para que
          // decidamos juntos la lógica exacta según lo que se vea en pruebas reales.
          console.warn(`[Webhooks:refund.create] ⚠️ Reembolso detectado pero SIN acción automática implementada todavía (paymentId=${originalPaymentId}).`);
          break;
        }

        default: {
          console.log(`[Webhooks] Evento "${eventType}" recibido pero no manejado explícitamente (no requiere acción, o falta implementarlo).`);
          break;
        }
      }
    } catch (err: any) {
      console.error(`[Webhooks] ❌ Error procesando evento "${eventType}" ->`, err?.stack ?? err?.message);
      // Igual respondemos 200 para no generar reintentos infinitos por un
      // error de nuestro lado; el log queda para diagnosticar.
    }

    return { received: true, processed: true };
  }
}
