import { describe, it, expect, beforeEach } from "bun:test";
import { mockPrisma, resetMocks, createTestApp, makeRequest, mockLocation } from "../../test/helpers";
import { Elysia } from "elysia";
import { CreateLocationBody, UpdateLocationBody } from "./model";

function createLocationsTestModule() {
  const { LocationsService } = require("./service");
  return new Elysia({ prefix: "/locations" })
    .post("/", async ({ currentUser, body }: any) => {
      return LocationsService.create(currentUser.id, body);
    }, { body: CreateLocationBody })
    .get("/", async ({ currentUser }: any) => {
      return LocationsService.findAllByUser(currentUser.id);
    })
    .get("/:id", async ({ currentUser, params }: any) => {
      return LocationsService.findOne(params.id, currentUser.id);
    })
    .patch("/:id", async ({ currentUser, params, body }: any) => {
      return LocationsService.update(params.id, currentUser.id, body);
    }, { body: UpdateLocationBody })
    .delete("/:id", async ({ currentUser, params }: any) => {
      return LocationsService.remove(params.id, currentUser.id);
    });
}

describe("locations module", () => {
  beforeEach(() => resetMocks());

  it("POST /locations → 200 creates location", async () => {
    (mockPrisma.location.create as any).mockResolvedValue(mockLocation);
    const app = createTestApp(createLocationsTestModule());
    const res = await makeRequest(app, "POST", "/locations", { address: "456 Street" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.address).toBe("456 Street");
  });

  it("GET /locations → 200 returns array", async () => {
    (mockPrisma.location.findMany as any).mockResolvedValue([mockLocation]);
    const app = createTestApp(createLocationsTestModule());
    const res = await makeRequest(app, "GET", "/locations");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(1);
  });

  it("GET /locations/:id → 200 returns location", async () => {
    const loc = { ...mockLocation, tanks: [] };
    (mockPrisma.location.findUnique as any).mockResolvedValue(loc);
    const app = createTestApp(createLocationsTestModule());
    const res = await makeRequest(app, "GET", "/locations/location-1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("location-1");
  });

  it("GET /locations/:id → 404 when not found", async () => {
    (mockPrisma.location.findUnique as any).mockResolvedValue(null);
    const app = createTestApp(createLocationsTestModule());
    const res = await makeRequest(app, "GET", "/locations/nonexistent");
    expect(res.status).toBe(404);
  });

  it("GET /locations/:id → 403 wrong user", async () => {
    const loc = { ...mockLocation, userId: "other-user", tanks: [] };
    (mockPrisma.location.findUnique as any).mockResolvedValue(loc);
    const app = createTestApp(createLocationsTestModule());
    const res = await makeRequest(app, "GET", "/locations/location-1");
    expect(res.status).toBe(403);
  });

  it("PATCH /locations/:id → 200 updates location", async () => {
    (mockPrisma.location.findUnique as any).mockResolvedValue(mockLocation);
    const updated = { ...mockLocation, address: "789 New St" };
    (mockPrisma.location.update as any).mockResolvedValue(updated);
    const app = createTestApp(createLocationsTestModule());
    const res = await makeRequest(app, "PATCH", "/locations/location-1", { address: "789 New St" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.address).toBe("789 New St");
  });

  it("DELETE /locations/:id → 200 deletes location", async () => {
    (mockPrisma.location.findUnique as any).mockResolvedValue(mockLocation);
    (mockPrisma.location.delete as any).mockResolvedValue(mockLocation);
    const app = createTestApp(createLocationsTestModule());
    const res = await makeRequest(app, "DELETE", "/locations/location-1");
    expect(res.status).toBe(200);
  });

  it("DELETE /locations/:id → 403 wrong user", async () => {
    const loc = { ...mockLocation, userId: "other-user" };
    (mockPrisma.location.findUnique as any).mockResolvedValue(loc);
    const app = createTestApp(createLocationsTestModule());
    const res = await makeRequest(app, "DELETE", "/locations/location-1");
    expect(res.status).toBe(403);
  });
});
