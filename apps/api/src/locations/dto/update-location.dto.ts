import { IsString, IsOptional } from 'class-validator';

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
