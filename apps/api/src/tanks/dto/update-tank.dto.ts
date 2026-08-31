import { IsNumber, IsEnum, IsBoolean, IsOptional } from 'class-validator';

enum UsageLevel {
  LIGHT = 'LIGHT',
  MODERATE = 'MODERATE',
  HEAVY = 'HEAVY',
}

export class UpdateTankDto {
  @IsOptional()
  @IsNumber()
  capacityKg?: number;

  @IsOptional()
  @IsEnum(UsageLevel)
  usageLevel?: UsageLevel;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
