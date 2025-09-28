import { describe, expect, it } from "vitest";
import { GeoService } from "../services/geoService";

describe("GeoService", () => {
  const geo = new GeoService({ toleranceMeters: 10 });

  it("computes haversine distance correctly", () => {
    const distance = geo.haversineDistanceMeters({ latitude: 40.7128, longitude: -74.006 }, { latitude: 34.0522, longitude: -118.2437 });
    expect(distance).toBeGreaterThan(3_900_000);
    expect(distance).toBeLessThan(4_400_000);
  });

  it("flags points within geofence", () => {
    const project = {
      id: "proj",
      name: "Test",
      slug: "test",
      address: undefined,
      latitude: 40.7128,
      longitude: -74.006,
      geofenceRadiusMeters: 100,
      notionPageId: "proj",
      status: "active" as const,
      updatedAt: new Date(),
      createdAt: new Date()
    };

    const inside = geo.isWithinGeofence({ latitude: 40.7129, longitude: -74.0061 }, project);
    const outside = geo.isWithinGeofence({ latitude: 40.72, longitude: -74.1 }, project);

    expect(inside).toBe(true);
    expect(outside).toBe(false);
  });
});
