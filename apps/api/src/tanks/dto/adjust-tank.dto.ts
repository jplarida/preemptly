import { IsEnum } from 'class-validator';

enum AdjustmentType {
  COOKED_MORE = 'COOKED_MORE',
  COOKED_LESS = 'COOKED_LESS',
  NORMAL = 'NORMAL',
}

export class AdjustTankDto {
  @IsEnum(AdjustmentType)
  adjustment: AdjustmentType;
}
