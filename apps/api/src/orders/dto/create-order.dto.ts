import { IsString, IsOptional } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  tankId: string;

  @IsString()
  retailerId: string;

  @IsOptional()
  @IsString()
  note?: string;
}
