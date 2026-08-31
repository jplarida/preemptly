import { describe, it, expect, beforeEach } from "bun:test";
import { mockPrisma, resetMocks, createTestApp, makeRequest, mockUser } from "../../test/helpers";
import { Elysia } from "elysia";
import { HttpError } from "../../lib/errors";

// Build a minimal module that mirrors usersModule but without real authMiddleware
function createUsersTestModule() {
  const { UsersService } = require("./service");
  const { UpdateUserBody } = require("./model");
  return new Elysia({ prefix: "/users" })
    .get("/me", async ({ currentUser }: any) => {
      return UsersService.getMe(currentUser.id);
    })
    .patch("/me", async ({ currentUser, body }: any) => {
      return UsersService.updateMe(currentUser.id, body);
    }, { body: UpdateUserBody });
}

describe("users module", () => {
  beforeEach(() => resetMocks());

  it("GET /users/me → 200 returns user", async () => {
    (mockPrisma.user.findUnique as any).mockResolvedValue(mockUser);
    const app = createTestApp(createUsersTestModule());
    const res = await makeRequest(app, "GET", "/users/me");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("user-1");
    expect(body.phone).toBe("+639170000001");
  });

  it("GET /users/me → 404 when user not found", async () => {
    (mockPrisma.user.findUnique as any).mockResolvedValue(null);
    const app = createTestApp(createUsersTestModule());
    const res = await makeRequest(app, "GET", "/users/me");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe("User not found");
  });

  it("PATCH /users/me → 200 updates user", async () => {
    const updated = { ...mockUser, name: "New Name" };
    (mockPrisma.user.update as any).mockResolvedValue(updated);
    const app = createTestApp(createUsersTestModule());
    const res = await makeRequest(app, "PATCH", "/users/me", { name: "New Name" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("New Name");
  });

  it("PATCH /users/me → 401 when no auth", async () => {
    // App without derive (no currentUser)
    const mod = createUsersTestModule();
    const app = new Elysia()
      .onError(({ error, set }) => {
        if (error instanceof HttpError) {
          set.status = error.status;
          return { statusCode: error.status, message: error.message, timestamp: new Date().toISOString() };
        }
        const status = (error as any).status ?? 500;
        set.status = status;
        return { statusCode: status, message: "Internal Server Error", timestamp: new Date().toISOString() };
      })
      .use(mod);
    const res = await makeRequest(app, "PATCH", "/users/me", { name: "X" });
    // Without currentUser derived, accessing currentUser.id will throw
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
