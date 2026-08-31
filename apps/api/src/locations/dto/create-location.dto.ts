import { IsString, IsEnum, IsOptional } from 'class-validator';

enum LocationType {
  HOME = 'HOME',
  BUSINESS = 'BUSINESS',
}

export class CreateLocationDto {
  @IsString()
  address: string;

  @IsEnum(LocationType)
  type: LocationType;

  @IsOptional()
  @IsString()
  timezone?: string;
}
