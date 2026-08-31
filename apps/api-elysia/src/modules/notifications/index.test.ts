import { describe, it, expect, beforeEach } from "bun:test";
import { mockPrisma, resetMocks, createTestApp, makeRequest } from "../../test/helpers";
import { Elysia } from "elysia";
import { RegisterTokenBody } from "./model";

function createNotificationsTestModule() {
  const { NotificationsService } = require("./service");
  return new Elysia({ prefix: "/notifications" })
    .post("/device-token", async ({ currentUser, body }: any) => {
      return NotificationsService.registerDeviceToken(currentUser.id, body.token, body.platform);
    }, { body: RegisterTokenBody })
    .delete("/device-token/:token", async ({ params }: any) => {
      return NotificationsService.removeDeviceToken(params.token);
    });
}

describe("notifications module", () => {
  beforeEach(() => resetMocks());

  it("POST /notifications/device-token → 200 upserts token", async () => {
    const token = { id: "dt-1", userId: "user-1", token: "expo-token-123", platform: "ios" };
    (mockPrisma.deviceToken.upsert as any).mockResolvedValue(token);
    const app = createTestApp(createNotificationsTestModule());
    const res = await makeRequest(app, "POST", "/notifications/device-token", {
      token: "expo-token-123",
      platform: "ios",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBe("expo-token-123");
  });

  it("POST /notifications/device-token missing fields → 422", async () => {
    const app = createTestApp(createNotificationsTestModule());
    const res = await makeRequest(app, "POST", "/notifications/device-token", {});
    expect(res.status).toBe(422);
  });

  it("DELETE /notifications/device-token/:token → 200 removes token", async () => {
    (mockPrisma.deviceToken.deleteMany as any).mockResolvedValue({ count: 1 });
    const app = createTestApp(createNotificationsTestModule());
    const res = await makeRequest(app, "DELETE", "/notifications/device-token/expo-token-123");
    expect(res.status).toBe(200);
  });
});
