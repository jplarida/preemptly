import { describe, it, expect, beforeEach } from "bun:test";
import { mockPrisma, resetMocks, createTestApp, makeRequest, mockRetailer } from "../../test/helpers";
import { Elysia } from "elysia";
import { HttpError } from "../../lib/errors";
import { LinkRetailerBody } from "./model";

function createLinkingPublicModule() {
  const { LinkingService } = require("./service");
  return new Elysia({ prefix: "/link" })
    .get("/retailer/:code", async ({ params }: any) => {
      return LinkingService.resolveInviteCode(params.code);
    });
}

function createLinkingAuthModule() {
  const { LinkingService } = require("./service");
  return new Elysia({ prefix: "/link" })
    .post("/retailer", async ({ currentUser, body }: any) => {
      return LinkingService.linkCustomerToRetailer(currentUser.id, body);
    }, { body: LinkRetailerBody })
    .delete("/retailer/:retailerId", async ({ currentUser, params }: any) => {
      return LinkingService.unlinkCustomerFromRetailer(currentUser.id, params.retailerId);
    })
    .get("/retailers", async ({ currentUser }: any) => {
      return LinkingService.getLinkedRetailers(currentUser.id);
    })
    .patch("/retailer/:retailerId/primary", async ({ currentUser, params }: any) => {
      return LinkingService.setPrimaryRetailer(currentUser.id, params.retailerId);
    });
}

function createPublicApp() {
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
    .use(createLinkingPublicModule());
}

const mockLink = {
  id: "link-1",
  customerId: "user-1",
  retailerId: "retailer-1",
  linkedVia: "INVITE_LINK",
  status: "ACTIVE",
  isPrimary: true,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

describe("linking module", () => {
  beforeEach(() => resetMocks());

  it("GET /link/retailer/:code → 200 resolves and tracks click", async () => {
    (mockPrisma.retailer.findUnique as any).mockResolvedValue(mockRetailer);
    (mockPrisma.inviteStat.upsert as any).mockResolvedValue({});
    const app = createPublicApp();
    const res = await makeRequest(app, "GET", "/link/retailer/ABCD1234");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("retailer-1");
    expect(body.businessName).toBe("Gas Store");
  });

  it("GET /link/retailer/:code → 404 invalid code", async () => {
    (mockPrisma.retailer.findUnique as any).mockResolvedValue(null);
    const app = createPublicApp();
    const res = await makeRequest(app, "GET", "/link/retailer/INVALID");
    expect(res.status).toBe(404);
  });

  it("POST /link/retailer → 200 links (first = primary)", async () => {
    (mockPrisma.retailer.findUnique as any).mockResolvedValue(mockRetailer);
    (mockPrisma.customerRetailerLink.findUnique as any).mockResolvedValue(null);
    (mockPrisma.customerRetailerLink.count as any).mockResolvedValue(0);
    (mockPrisma.customerRetailerLink.create as any).mockResolvedValue({ ...mockLink, isPrimary: true });
    (mockPrisma.inviteStat.upsert as any).mockResolvedValue({});
    const app = createTestApp(createLinkingAuthModule());
    const res = await makeRequest(app, "POST", "/link/retailer", {
      code: "ABCD1234",
      method: "INVITE_LINK",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isPrimary).toBe(true);
  });

  it("POST /link/retailer → 409 already linked", async () => {
    (mockPrisma.retailer.findUnique as any).mockResolvedValue(mockRetailer);
    (mockPrisma.customerRetailerLink.findUnique as any).mockResolvedValue(mockLink);
    const app = createTestApp(createLinkingAuthModule());
    const res = await makeRequest(app, "POST", "/link/retailer", {
      code: "ABCD1234",
      method: "INVITE_LINK",
    });
    expect(res.status).toBe(409);
  });

  it("POST /link/retailer → 200 reactivates inactive link", async () => {
    const inactiveLink = { ...mockLink, status: "INACTIVE" };
    (mockPrisma.retailer.findUnique as any).mockResolvedValue(mockRetailer);
    (mockPrisma.customerRetailerLink.findUnique as any).mockResolvedValue(inactiveLink);
    (mockPrisma.customerRetailerLink.update as any).mockResolvedValue({ ...inactiveLink, status: "ACTIVE" });
    (mockPrisma.inviteStat.upsert as any).mockResolvedValue({});
    const app = createTestApp(createLinkingAuthModule());
    const res = await makeRequest(app, "POST", "/link/retailer", {
      code: "ABCD1234",
      method: "INVITE_LINK",
    });
    expect(res.status).toBe(200);
  });

  it("DELETE /link/retailer/:id → 200 unlinks and promotes primary", async () => {
    (mockPrisma.customerRetailerLink.findUnique as any).mockResolvedValue(mockLink);
    (mockPrisma.customerRetailerLink.update as any).mockResolvedValue({ ...mockLink, status: "INACTIVE", isPrimary: false });
    const nextLink = { ...mockLink, id: "link-2", retailerId: "retailer-2", isPrimary: false };
    (mockPrisma.customerRetailerLink.findFirst as any).mockResolvedValue(nextLink);
    const app = createTestApp(createLinkingAuthModule());
    const res = await makeRequest(app, "DELETE", "/link/retailer/retailer-1");
    expect(res.status).toBe(200);
  });

  it("GET /link/retailers → 200 returns list with isPrimary", async () => {
    (mockPrisma.customerRetailerLink.findMany as any).mockResolvedValue([
      { ...mockLink, retailer: mockRetailer },
    ]);
    const app = createTestApp(createLinkingAuthModule());
    const res = await makeRequest(app, "GET", "/link/retailers");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].isPrimary).toBe(true);
    expect(body[0].retailer.businessName).toBe("Gas Store");
  });

  it("PATCH /link/retailer/:id/primary → 200 sets primary", async () => {
    (mockPrisma.customerRetailerLink.findUnique as any).mockResolvedValue(mockLink);
    (mockPrisma.customerRetailerLink.updateMany as any).mockResolvedValue({ count: 1 });
    (mockPrisma.customerRetailerLink.update as any).mockResolvedValue({ ...mockLink, isPrimary: true });
    const app = createTestApp(createLinkingAuthModule());
    const res = await makeRequest(app, "PATCH", "/link/retailer/retailer-1/primary");
    expect(res.status).toBe(200);
  });
});
