import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class LogRefillDto {
  @IsString()
  tankId: string;

  @IsOptional()
  @IsString()
  refillDate?: string;

  @IsOptional()
  @IsBoolean()
  confirmOutlier?: boolean;
}
