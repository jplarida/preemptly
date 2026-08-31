import { IsString } from 'class-validator';

export class RegisterRetailerDto {
  @IsString()
  businessName: string;

  @IsString()
  ownerName: string;

  @IsString()
  phone: string;

  @IsString()
  address: string;

  @IsString()
  city: string;
}
