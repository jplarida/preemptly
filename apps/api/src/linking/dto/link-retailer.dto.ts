import { IsString, IsEnum } from 'class-validator';

enum LinkMethod {
  INVITE_LINK = 'INVITE_LINK',
  QR_CODE = 'QR_CODE',
  MANUAL_CODE = 'MANUAL_CODE',
}

export class LinkRetailerDto {
  @IsString()
  code: string;

  @IsEnum(LinkMethod)
  method: LinkMethod;
}
