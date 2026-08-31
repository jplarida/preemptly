export interface OtpSender {
  send(phone: string, code: string): Promise<void>;
}

export const OTP_SENDER = 'OTP_SENDER';
