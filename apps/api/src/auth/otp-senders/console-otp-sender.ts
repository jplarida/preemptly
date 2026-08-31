import { Injectable, Logger } from '@nestjs/common';
import { OtpSender } from '../interfaces/otp-sender.interface';

@Injectable()
export class ConsoleOtpSender implements OtpSender {
  private readonly logger = new Logger(ConsoleOtpSender.name);

  async send(phone: string, code: string): Promise<void> {
    this.logger.log(`[DEV] OTP for ${phone}: ${code}`);
  }
}
