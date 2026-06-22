export class CreateActivityLogDto {
  type!: string;
  action!: string;
  propertyId?: string;
  userId?: string;
}