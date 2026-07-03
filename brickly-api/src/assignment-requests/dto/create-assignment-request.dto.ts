import { IsMongoId, IsNotEmpty } from 'class-validator';

export class CreateAssignmentRequestDto {
  @IsMongoId()
  @IsNotEmpty()
  propertyId!: string;
}
