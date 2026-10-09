import { PlanMaxProfiles, PlanRecurrentType, RecurrentType } from './plan.enum';
import { AllPlanType, PlanPrices } from './pricecost.enum';

export type PlanPeriod = 'Mensual' | 'Anual' | 'Semanal' | 'Diario';

export interface SubscriptionPlanInfo {
  key: string;
  name: string;
  period: PlanPeriod;
  price: number | null;
  currency: string;
  agents: number | null;
  color: string;
  custom: boolean;
}

export interface FeaturedPlanInfo {
  key: string;
  name: string;
  price: number;
  currency: string;
  durationDays: number;
  color: string;
  description: string;
  features: string[];
  audience: 'agente' | 'agencia' | 'propiedad';
}

const periodFromRecurrent = (type?: RecurrentType): PlanPeriod => {
  switch (type) {
    case RecurrentType.ANUAL:
      return 'Anual';
    case RecurrentType.SEMANAL:
      return 'Semanal';
    case RecurrentType.DIARIO:
      return 'Diario';
    default:
      return 'Mensual';
  }
};

/**
 * Metadata de presentacion de los planes de suscripcion.
 * La duracion y la cantidad de agentes se derivan de plan.enum.ts para no
 * duplicar la fuente de verdad; aqui solo vive lo que es puramente de UI
 * (nombre comercial, precio en GTQ y color de marca).
 */
const SUBSCRIPTION_META: Record<
  string,
  { name: string; price: number | null; color: string }
> = {
  BROKER_MENSUAL: { name: 'AGENTE INDIVIDUAL', price: 420, color: '#F29500' },
  BROKER_ANUAL: { name: 'AGENTE INDIVIDUAL', price: 4200, color: '#F29500' },
  AGENCIA_SILVER: { name: 'AGENCIA SILVER', price: 420, color: 'rgb(180 180 180)' },
  AGENCIA_SILVER_A: { name: 'AGENCIA SILVER', price: 4200, color: 'rgb(180 180 180)' },
  AGENCIA_GOLD: { name: 'AGENCIA GOLD', price: 650, color: 'rgb(200 165 14)' },
  AGENCIA_GOLD6: { name: 'AGENCIA GOLD', price: 725, color: 'rgb(200 165 14)' },
  AGENCIA_GOLD7: { name: 'AGENCIA GOLD', price: 800, color: 'rgb(200 165 14)' },
  AGENCIA_GOLD8: { name: 'AGENCIA GOLD', price: 875, color: 'rgb(200 165 14)' },
  AGENCIA_GOLD9: { name: 'AGENCIA GOLD', price: 950, color: 'rgb(200 165 14)' },
  AGENCIA_GOLD_A: { name: 'AGENCIA GOLD', price: 6500, color: 'rgb(200 165 14)' },
  AGENCIA_GOLD6_A: { name: 'AGENCIA GOLD', price: 6575, color: 'rgb(200 165 14)' },
  AGENCIA_GOLD7_A: { name: 'AGENCIA GOLD', price: 6650, color: 'rgb(200 165 14)' },
  AGENCIA_GOLD8_A: { name: 'AGENCIA GOLD', price: 6725, color: 'rgb(200 165 14)' },
  AGENCIA_GOLD9_A: { name: 'AGENCIA GOLD', price: 6800, color: 'rgb(200 165 14)' },
  AGENCIA_DIAMOND: { name: 'AGENCIA DIAMOND', price: 1050, color: 'rgb(0 154 241)' },
  AGENCIA_DIAMOND_A: { name: 'AGENCIA DIAMOND', price: 10500, color: 'rgb(0 154 241)' },
  AGENCIA_DIAMOND_P: { name: 'AGENCIA DIAMOND', price: null, color: 'rgb(0 154 241)' },
};

export const SubscriptionCatalog: Record<string, SubscriptionPlanInfo> =
  Object.keys(SUBSCRIPTION_META).reduce((acc, key) => {
    const meta = SUBSCRIPTION_META[key];
    const custom = key === 'AGENCIA_DIAMOND_P';
    acc[key] = {
      key,
      name: meta.name,
      period: periodFromRecurrent(PlanRecurrentType[key]),
      price: meta.price,
      currency: 'GTQ',
      agents: custom ? null : (PlanMaxProfiles[key] ?? null),
      color: meta.color,
      custom,
    };
    return acc;
  }, {} as Record<string, SubscriptionPlanInfo>);

/**
 * Paquetes destacados (productos de visibilidad). El precio es el que se
 * cobra realmente en Recurrente (PlanPrices, en GTQ) y la duracion coincide
 * con la aplicada por el webhook al confirmarse el pago.
 */
export const FeaturedCatalog: FeaturedPlanInfo[] = [
  {
    key: AllPlanType.AGENT_SIGNATURE,
    name: 'Agent Signature',
    price: PlanPrices[AllPlanType.AGENT_SIGNATURE],
    currency: 'GTQ',
    durationDays: 30,
    color: '#5E7C9C',
    description: 'Perfil destacado en búsquedas + badge verificado + 1 propiedad destacada.',
    features: [
      'Perfil de agente destacado en búsquedas.',
      'Badge "Agente Verificado".',
      '1 propiedad destacada activa al mes (rotativa o fija).',
      'Perfil mejorado (bio + branding básico).',
      'URL propia dentro de Brickly.',
    ],
    audience: 'agente',
  },
  {
    key: AllPlanType.AGENT_PRESTIGE,
    name: 'Agent Prestige',
    price: PlanPrices[AllPlanType.AGENT_PRESTIGE],
    currency: 'GTQ',
    durationDays: 30,
    color: '#D4AF37',
    description: 'Hasta 3 propiedades destacadas + perfil mejorado + prioridad en leads.',
    features: [
      'Perfil de agente destacado en búsquedas.',
      'Badge "Agente Verificado".',
      'Hasta 3 propiedades destacadas simultáneamente.',
      'Perfil mejorado (bio + branding básico).',
      'Prioridad en resultados de búsqueda.',
      'URL propia dentro de Brickly.',
      'Recepción prioritaria de leads.',
    ],
    audience: 'agente',
  },
  {
    key: AllPlanType.PRIVATE_AGENT,
    name: 'Private Collection Agent',
    price: PlanPrices[AllPlanType.PRIVATE_AGENT],
    currency: 'GTQ',
    durationDays: 30,
    color: '#3B1E4A',
    description: 'Hasta 7 propiedades destacadas + newsletter dedicado + redes sociales.',
    features: [
      'Perfil de agente destacado en búsquedas.',
      'Badge "Agente Verificado".',
      'Hasta 7 propiedades destacadas simultáneamente.',
      'Perfil mejorado (bio + branding básico).',
      'Prioridad en resultados de búsqueda.',
      'URL propia dentro de Brickly.',
      'Recepción prioritaria de leads.',
      'Newsletter dedicado (1 al mes).',
      'Amplificación en redes sociales.',
    ],
    audience: 'agente',
  },
  {
    key: AllPlanType.AGENCY_SIGNATURE,
    name: 'Agency Signature',
    price: PlanPrices[AllPlanType.AGENCY_SIGNATURE],
    currency: 'GTQ',
    durationDays: 30,
    color: '#D4AF37',
    description: 'Perfil de agencia destacado + hasta 5 propiedades destacadas.',
    features: [
      'Perfil de agencia destacado en búsquedas.',
      'Hasta 5 propiedades destacadas simultáneamente (pool compartido).',
      'Prioridad media en resultados.',
      'URL propia de agencia dentro de Brickly.',
    ],
    audience: 'agencia',
  },
  {
    key: AllPlanType.PRIVATE_AGENCY,
    name: 'Private Collection Agency',
    price: PlanPrices[AllPlanType.PRIVATE_AGENCY],
    currency: 'GTQ',
    durationDays: 30,
    color: '#3B1E4A',
    description: 'Hasta 10 propiedades destacadas + newsletter dedicado + redes sociales.',
    features: [
      'Perfil de agencia destacado en búsquedas.',
      'Hasta 10 propiedades destacadas simultáneamente.',
      'URL propia de agencia dentro de Brickly.',
      'Perfil en portada (rotación destacada).',
      'Newsletter dedicado (1 al mes).',
      'Amplificación en redes sociales.',
      'Badge "Private Collection Agency".',
      'Prioridad alta en resultados.',
    ],
    audience: 'agencia',
  },
  {
    key: AllPlanType.PROPERTY_FEATURED,
    name: 'Destacar Propiedad',
    price: PlanPrices[AllPlanType.PROPERTY_FEATURED],
    currency: 'GTQ',
    durationDays: 30,
    color: '#FFC94D',
    description: 'Tu propiedad aparece primero en búsquedas y en la portada.',
    features: [
      'Aparece primero en los resultados de búsqueda.',
      'Badge de "Destacada".',
      'Mayor exposición en el portal.',
      'Rotación en la portada.',
    ],
    audience: 'propiedad',
  },
];

export const getPlansCatalog = () => ({
  subscriptionPlans: SubscriptionCatalog,
  featuredPlans: {
    agente: FeaturedCatalog.filter((p) => p.audience === 'agente'),
    agencia: FeaturedCatalog.filter((p) => p.audience === 'agencia'),
    propiedad: FeaturedCatalog.filter((p) => p.audience === 'propiedad'),
  },
});
