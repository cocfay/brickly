import { Role } from '../../auth/roles.enum';

export enum PlanType {
  AGENTE_BASICO = 'prod_52hzbwb9',
  DESARROLLADORA = 'prod_bjlws6a6',
  AGENCIA = 'prod_a3poa7d6',
  ARQUITECTO = 'prod_z6hcx0vn',
}

export const PlanRoleMap = {
  [PlanType.AGENTE_BASICO]: Role.AGENTE,
  [PlanType.DESARROLLADORA]: Role.DESARROLLADORA,
  [PlanType.AGENCIA]: Role.AGENCIA,
  [PlanType.ARQUITECTO]: Role.ARQUITECTO
};