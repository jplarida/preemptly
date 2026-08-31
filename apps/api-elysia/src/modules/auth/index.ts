import { Elysia } from "elysia";
import { jwtPlugin } from "../../lib/auth";
import { AuthService } from "./service";
import { SendOtpBody, VerifyOtpBody } from "./model";

export const authModule = new Elysia({ prefix: "/auth" })
  .use(jwtPlugin)
  .post("/send-otp", async ({ body }) => {
    return AuthService.sendOtp(body.phone);
  }, { body: SendOtpBody })
  .post("/verify-otp", async ({ body, jwt }) => {
    return AuthService.verifyOtp(body.phone, body.code, (payload) => jwt.sign(payload));
  }, { body: VerifyOtpBody })
  .post("/retailer/verify-otp", async ({ body, jwt }) => {
    return AuthService.verifyRetailerOtp(body.phone, body.code, (payload) => jwt.sign(payload));
  }, { body: VerifyOtpBody })
  .post("/rider/verify-otp", async ({ body, jwt }) => {
    return AuthService.verifyRiderOtp(body.phone, body.code, (payload) => jwt.sign(payload));
  }, { body: VerifyOtpBody });
