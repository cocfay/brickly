import { Role } from '../../auth/roles.enum';

export enum PlanType {
  // AGENTE_BASICO = 'prod_52hzbwb9',
  // DESARROLLADORA = 'prod_bjlws6a6',
  // AGENCIA = 'prod_a3poa7d6',
  // ARQUITECTO = 'prod_z6hcx0vn',
  BROKER_MENSUAL = 'prod_dr9boirb',
  BROKER_ANUAL = 'prod_amf6dszm',
  AGENCIA_MENSUAL = 'prod_uvtlflin',
  AGENCIA_ANUAL = 'prod_0e7tmzuj',
}

export const PlanRoleMap = {
  [PlanType.BROKER_MENSUAL]: Role.AGENTE,
  [PlanType.BROKER_ANUAL]: Role.AGENTE,
  [PlanType.AGENCIA_MENSUAL]: Role.AGENCIA,
  [PlanType.AGENCIA_ANUAL]: Role.AGENCIA,
  // [PlanType.DESARROLLADORA]: Role.DESARROLLADORA,
  // [PlanType.AGENCIA]: Role.AGENCIA,
  // [PlanType.ARQUITECTO]: Role.ARQUITECTO
};