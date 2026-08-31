import { describe, it, expect, beforeEach } from "bun:test";
import { mockPrisma, resetMocks, mockUser, mockRetailer, mockRider } from "../../test/helpers";
import { Elysia } from "elysia";
import { HttpError } from "../../lib/errors";
import { jwtPlugin } from "../../lib/auth";
import { authModule } from "./index";

function createAuthApp() {
  return new Elysia()
    .onError(({ error, set }) => {
      if (error instanceof HttpError) {
        set.status = error.status;
        return { statusCode: error.status, message: error.message, timestamp: new Date().toISOString() };
      }
      const status = (error as any).status ?? 500;
      set.status = status;
      return { statusCode: status, message: "message" in error ? (error as any).message : "Internal Server Error", timestamp: new Date().toISOString() };
    })
    .use(authModule);
}

const validOtp = {
  id: "otp-1",
  phone: "+639170000001",
  code: "123456",
  verified: false,
  expiresAt: new Date(Date.now() + 300000),
  createdAt: new Date(),
};

describe("auth module", () => {
  beforeEach(() => resetMocks());

  it("POST /auth/send-otp → 200 sends OTP", async () => {
    (mockPrisma.otpCode.create as any).mockResolvedValue(validOtp);
    const app = createAuthApp();
    const res = await app.handle(
      new Request("http://localhost/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "+639170000001" }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("OTP sent successfully");
  });

  it("POST /auth/send-otp missing phone → 422", async () => {
    const app = createAuthApp();
    const res = await app.handle(
      new Request("http://localhost/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(422);
  });

  it("POST /auth/verify-otp valid → 200 with accessToken", async () => {
    (mockPrisma.otpCode.findFirst as any).mockResolvedValue(validOtp);
    (mockPrisma.otpCode.update as any).mockResolvedValue({ ...validOtp, verified: true });
    (mockPrisma.user.findUnique as any).mockResolvedValue(mockUser);
    const app = createAuthApp();
    const res = await app.handle(
      new Request("http://localhost/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "+639170000001", code: "123456" }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accessToken).toBeDefined();
    expect(body.isNewUser).toBe(false);
    expect(body.user.id).toBe("user-1");
  });

  it("POST /auth/verify-otp invalid code → 400", async () => {
    (mockPrisma.otpCode.findFirst as any).mockResolvedValue(null);
    const app = createAuthApp();
    const res = await app.handle(
      new Request("http://localhost/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "+639170000001", code: "000000" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST /auth/retailer/verify-otp valid → 200 with retailer", async () => {
    (mockPrisma.otpCode.findFirst as any).mockResolvedValue(validOtp);
    (mockPrisma.otpCode.update as any).mockResolvedValue({ ...validOtp, verified: true });
    (mockPrisma.retailer.findUnique as any).mockResolvedValue(mockRetailer);
    const app = createAuthApp();
    const res = await app.handle(
      new Request("http://localhost/auth/retailer/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "+639170000002", code: "123456" }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accessToken).toBeDefined();
    expect(body.retailer.id).toBe("retailer-1");
  });

  it("POST /auth/rider/verify-otp valid → 200 with rider", async () => {
    (mockPrisma.otpCode.findFirst as any).mockResolvedValue(validOtp);
    (mockPrisma.otpCode.update as any).mockResolvedValue({ ...validOtp, verified: true });
    (mockPrisma.rider.findUnique as any).mockResolvedValue(mockRider);
    const app = createAuthApp();
    const res = await app.handle(
      new Request("http://localhost/auth/rider/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "+639170000003", code: "123456" }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accessToken).toBeDefined();
    expect(body.rider.id).toBe("rider-1");
  });
});
