import { Role } from '../../auth/roles.enum';

export enum PlanType {
  BROKER_MENSUAL = 'prod_xanxgzxf',
  BROKER_ANUAL = 'prod_juawbyxo',
  AGENCIA_SILVER = 'prod_fpr1iqit',
  AGENCIA_GOLD = 'prod_rplsn8dl',
  AGENCIA_GOLD6 = 'prod_s2p8gav0',
  AGENCIA_GOLD7 = 'prod_ebhk1vsc',
  AGENCIA_GOLD8 = 'prod_0zzwls9k',
  AGENCIA_GOLD9 = 'prod_ihinbfh2',
  AGENCIA_DIAMOND = 'prod_mnoceotz',
  AGENCIA_SILVER_A = 'prod_fecekntr',
  AGENCIA_GOLD_A = 'prod_gp4vurkb',
  AGENCIA_GOLD6_A = 'prod_4isytqhv',
  AGENCIA_GOLD7_A = 'prod_tbmkfzv9',
  AGENCIA_GOLD8_A = 'prod_msukyrwi',
  AGENCIA_GOLD9_A = 'prod_ipbghckv',
  AGENCIA_DIAMOND_A = 'prod_ghimrpoz',
  TEST_WEEK = 'prod_k3rysjip',
  TEST_DAILY = 'prod_4yjfzt2g',
  AGENCIA_DIAMOND_P = 'prod_manual_diamond_p',
}

/**
 * ⚠️ IMPORTANTE: estos 3 mapas (PlanRoleMap, PlanMaxProfiles,
 * PlanRecurrentType) están indexados por el NOMBRE DE CLAVE del enum
 * (ej. "AGENCIA_SILVER"), NO por su valor/product_id (ej. "prod_fpr1iqit").
 *
 * Esto es porque el valor que viaja en `metadata.plan` del checkout,
 * el que se guarda en `user.subscriptionPlan`, y el que envían los
 * botones del frontend, es siempre el nombre de clave legible
 * ("AGENCIA_SILVER"). El product_id real solo se usa puntualmente al
 * llamar a la API de Recurrente (ver PaymentsService.getPlanId).
 *
 * Si en algún momento se quisiera indexar por el product_id, habría que
 * cambiar TODOS los usos (metadata, subscriptionPlan, frontend) a la vez.
 */
export const PlanRoleMap: Record<string, Role> = {
  BROKER_MENSUAL: Role.AGENTE,
  BROKER_ANUAL: Role.AGENTE,
  AGENCIA_SILVER: Role.AGENCIA,
  AGENCIA_GOLD: Role.AGENCIA,
  AGENCIA_GOLD6: Role.AGENCIA,
  AGENCIA_GOLD7: Role.AGENCIA,
  AGENCIA_GOLD8: Role.AGENCIA,
  AGENCIA_GOLD9: Role.AGENCIA,
  AGENCIA_DIAMOND: Role.AGENCIA,
  AGENCIA_SILVER_A: Role.AGENCIA,
  AGENCIA_GOLD_A: Role.AGENCIA,
  AGENCIA_GOLD6_A: Role.AGENCIA,
  AGENCIA_GOLD7_A: Role.AGENCIA,
  AGENCIA_GOLD8_A: Role.AGENCIA,
  AGENCIA_GOLD9_A: Role.AGENCIA,
  AGENCIA_DIAMOND_A: Role.AGENCIA,
  TEST_WEEK: Role.AGENCIA,
  TEST_DAILY: Role.AGENCIA,
  AGENCIA_DIAMOND_P: Role.AGENCIA,
};

export const PlanMaxProfiles: Record<string, number> = {
  BROKER_MENSUAL: 0,
  BROKER_ANUAL: 0,
  AGENCIA_SILVER: 0,
  AGENCIA_GOLD: 5,
  AGENCIA_GOLD6: 6,
  AGENCIA_GOLD7: 7,
  AGENCIA_GOLD8: 8,
  AGENCIA_GOLD9: 9,
  AGENCIA_DIAMOND: 10,
  AGENCIA_SILVER_A: 0,
  AGENCIA_GOLD_A: 5,
  AGENCIA_GOLD6_A: 6,
  AGENCIA_GOLD7_A: 7,
  AGENCIA_GOLD8_A: 8,
  AGENCIA_GOLD9_A: 9,
  AGENCIA_DIAMOND_A: 10,
  TEST_WEEK: 5,
  TEST_DAILY: 5,
  AGENCIA_DIAMOND_P: 0,
};

/**
 * Modalidad de recurrencia de cada plan, usada para calcular la fecha de
 * expiración de la suscripción cuando Recurrente no nos da explícitamente
 * `current_period_ends_at` (fallback).
 */
export enum RecurrentType {
  MENSUAL = 'MENSUAL',
  ANUAL = 'ANUAL',
  SEMANAL = 'SEMANAL',
  DIARIO = 'DIARIO',
}

export const PlanRecurrentType: Record<string, RecurrentType> = {
  BROKER_MENSUAL: RecurrentType.MENSUAL,
  BROKER_ANUAL: RecurrentType.ANUAL,
  AGENCIA_SILVER: RecurrentType.MENSUAL,
  AGENCIA_GOLD: RecurrentType.MENSUAL,
  AGENCIA_GOLD6: RecurrentType.MENSUAL,
  AGENCIA_GOLD7: RecurrentType.MENSUAL,
  AGENCIA_GOLD8: RecurrentType.MENSUAL,
  AGENCIA_GOLD9: RecurrentType.MENSUAL,
  AGENCIA_DIAMOND: RecurrentType.MENSUAL,
  AGENCIA_SILVER_A: RecurrentType.ANUAL,
  AGENCIA_GOLD_A: RecurrentType.ANUAL,
  AGENCIA_GOLD6_A: RecurrentType.ANUAL,
  AGENCIA_GOLD7_A: RecurrentType.ANUAL,
  AGENCIA_GOLD8_A: RecurrentType.ANUAL,
  AGENCIA_GOLD9_A: RecurrentType.ANUAL,
  AGENCIA_DIAMOND_A: RecurrentType.ANUAL,
  TEST_WEEK: RecurrentType.SEMANAL,
  TEST_DAILY: RecurrentType.DIARIO,
  AGENCIA_DIAMOND_P: RecurrentType.MENSUAL,
};

/**
 * Calcula la fecha de expiración a partir de una fecha base y el plan
 * adquirido (nombre de clave, ej. "AGENCIA_GOLD_A"). Se usa como fallback
 * cuando el payload de Recurrente no trae `current_period_ends_at`.
 */
export function computeExpirationDate(plan: string, from: Date = new Date()): Date {
  const recurrentType = PlanRecurrentType[plan];
  const date = new Date(from);

  switch (recurrentType) {
    case RecurrentType.ANUAL:
      date.setFullYear(date.getFullYear() + 1);
      break;

    case RecurrentType.SEMANAL:
      date.setDate(date.getDate() + 7);
      break;

    case RecurrentType.DIARIO:
      date.setDate(date.getDate() + 1);
      break;

    case RecurrentType.MENSUAL:
    default:
      // Por defecto (o MENSUAL, o plan desconocido), se asume un mes.
      date.setMonth(date.getMonth() + 1);
      break;
  }

  return date;
}
