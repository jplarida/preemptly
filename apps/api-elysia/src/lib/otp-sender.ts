export interface OtpSender {
  send(phone: string, code: string): Promise<void>;
}

export class ConsoleOtpSender implements OtpSender {
  async send(phone: string, code: string): Promise<void> {
    console.log(`[OTP] Sending code ${code} to ${phone}`);
  }
}

export const otpSender: OtpSender = new ConsoleOtpSender();
