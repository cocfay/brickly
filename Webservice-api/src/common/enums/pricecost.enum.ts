export enum AllPlanType {
  PROPERTY_FEATURED = 'PROPERTY_FEATURED',
  AGENT_SIGNATURE = 'AGENT_SIGNATURE',
  AGENT_PRESTIGE = 'AGENT_PRESTIGE',
  PRIVATE_AGENT = 'PRIVATE_AGENT',
  AGENCY_SIGNATURE = 'AGENCY_SIGNATURE',
  PRIVATE_AGENCY = 'PRIVATE_AGENCY',
}

export const PlanPrices = {
  [AllPlanType.PROPERTY_FEATURED]: 50.00,
  [AllPlanType.AGENT_SIGNATURE]: 25.00,
  [AllPlanType.AGENT_PRESTIGE]: 45.00,
  [AllPlanType.PRIVATE_AGENT]: 75.00,
  [AllPlanType.AGENCY_SIGNATURE]: 60.00,
  [AllPlanType.PRIVATE_AGENCY]: 100.00,
};

export const PlanDescription = {
  [AllPlanType.PROPERTY_FEATURED]: "Destacar Propiedad",
  [AllPlanType.AGENT_SIGNATURE]: "Adquirir Plan ( Agent Signature )",
  [AllPlanType.AGENT_PRESTIGE]: "Adquirir Plan ( Agent Prestige )",
  [AllPlanType.PRIVATE_AGENT]: "Adquirir plan ( Private Agent )",
  [AllPlanType.AGENCY_SIGNATURE]: "Adquirir plan ( Agency Signature )",
  [AllPlanType.PRIVATE_AGENCY]: "Adquirir plan ( Private Agency )",
};
