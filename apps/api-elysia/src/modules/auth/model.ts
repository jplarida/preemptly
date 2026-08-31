import { t } from "elysia";

export const SendOtpBody = t.Object({
  phone: t.String({ minLength: 1 }),
});

export const VerifyOtpBody = t.Object({
  phone: t.String({ minLength: 1 }),
  code: t.String({ minLength: 6, maxLength: 6 }),
});
