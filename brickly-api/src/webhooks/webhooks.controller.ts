import { Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
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

  @Post('recurrente')
  async handle(@Req() req: Request) {
    const event = req.body;

    // ✅ PAGO EXITOSO
    if (event.type === 'subscription.paid') {
      const data = event.data;

      // evitar duplicados
      if (await this.subService.alreadyProcessed(data.id)) {
        return { ok: true };
      }

      const { userId, plan } = data.metadata;

      const role = PlanRoleMap[plan];

      // guardar suscripción
      await this.subService.createOrUpdate({
        userId,
        plan,
        status: 'ACTIVE',
        recurrenteId: data.id,
      });

      // 🔥 agregar rol (NO reemplazar)
      await this.userService.addRole(userId, role);
    }

    // ❌ PAGO FALLIDO
    if (event.type === 'subscription.failed') {
      const { userId, plan } = event.data.metadata;

      const role = PlanRoleMap[plan];

      await this.subService.updateStatus(userId, 'FAILED');

      // opcional: quitar rol
      await this.userService.removeRole(userId, role);
    }

  if (event.type === 'charge.succeeded') {
    const data = event.data;
    const { thisId, plan } = data.metadata;

    if (data.metadata?.type_send === 'property') {

      await this.propertyService.activateFeatured(thisId, true);

    }else if(data.metadata?.type_send === 'user'){

      const expireDate = new Date(
        new Date().setDate(new Date().getDate() + 30)
      );

      await this.userService.updateById(thisId,{"featured_user" : 1, "featured_expire" : expireDate, "planUse" : plan});

    }
  }

    return { received: true };
  }
}