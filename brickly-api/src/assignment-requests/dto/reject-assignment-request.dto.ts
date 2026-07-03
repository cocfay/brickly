import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectAssignmentRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
