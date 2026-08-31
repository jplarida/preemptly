import { describe, it, expect, beforeEach } from "bun:test";
import { mockPrisma, resetMocks, makeRequest } from "../../test/helpers";
import { Elysia } from "elysia";
import { HttpError } from "../../lib/errors";
import { healthModule } from "./index";

function createHealthApp() {
  return new Elysia()
    .onError(({ error, set }) => {
      if (error instanceof HttpError) {
        set.status = error.status;
        return { statusCode: error.status, message: error.message, timestamp: new Date().toISOString() };
      }
      const status = (error as any).status ?? 500;
      set.status = status;
      return { statusCode: status, message: "Internal Server Error", timestamp: new Date().toISOString() };
    })
    .use(healthModule);
}

describe("health module", () => {
  beforeEach(() => resetMocks());

  it("GET /health → 200 status ok when DB is healthy", async () => {
    (mockPrisma.$queryRaw as any).mockResolvedValue([{ 1: 1 }]);
    const app = createHealthApp();
    const res = await makeRequest(app, "GET", "/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });

  it("GET /health → 200 status error when DB is down", async () => {
    (mockPrisma.$queryRaw as any).mockRejectedValue(new Error("DB down"));
    const app = createHealthApp();
    const res = await makeRequest(app, "GET", "/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("error");
  });
});
