import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';

enum TankModel {
  EXCHANGE = 'EXCHANGE',
  REFILL = 'REFILL',
}

enum UsageLevel {
  LIGHT = 'LIGHT',
  MODERATE = 'MODERATE',
  HEAVY = 'HEAVY',
}

export class CreateTankDto {
  @IsString()
  locationId: string;

  @IsNumber()
  capacityKg: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsEnum(TankModel)
  model: TankModel;

  @IsEnum(UsageLevel)
  usageLevel: UsageLevel;
}
