import { Project, ProjectSchema } from "../schemas/project";

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface GeoServiceOptions {
  toleranceMeters?: number;
}

export class GeoService {
  private readonly toleranceMeters: number;

  constructor(options: GeoServiceOptions = {}) {
    this.toleranceMeters = options.toleranceMeters ?? 50;
  }

  haversineDistanceMeters(a: GeoPoint, b: GeoPoint): number {
    const R = 6371e3;
    const φ1 = (a.latitude * Math.PI) / 180;
    const φ2 = (b.latitude * Math.PI) / 180;
    const Δφ = ((b.latitude - a.latitude) * Math.PI) / 180;
    const Δλ = ((b.longitude - a.longitude) * Math.PI) / 180;

    const sinΔφ = Math.sin(Δφ / 2);
    const sinΔλ = Math.sin(Δλ / 2);

    const aCalc = sinΔφ * sinΔφ + Math.cos(φ1) * Math.cos(φ2) * sinΔλ * sinΔλ;
    const c = 2 * Math.atan2(Math.sqrt(aCalc), Math.sqrt(1 - aCalc));

    return R * c;
  }

  findNearestProject(point: GeoPoint, projects: Project[]): { project: Project; distanceMeters: number } | null {
    let best: { project: Project; distanceMeters: number } | null = null;

    for (const project of projects) {
      if (project.latitude == null || project.longitude == null) continue;

      const distance = this.haversineDistanceMeters(point, {
        latitude: project.latitude,
        longitude: project.longitude
      });

      if (!best || distance < best.distanceMeters) {
        best = { project, distanceMeters: distance };
      }
    }

    return best;
  }

  isWithinGeofence(point: GeoPoint, project: Project): boolean {
    if (project.latitude == null || project.longitude == null) return false;

    const distance = this.haversineDistanceMeters(point, {
      latitude: project.latitude,
      longitude: project.longitude
    });

    const radiusMeters = project.geofenceRadiusMeters ?? this.toleranceMeters;
    return distance <= radiusMeters + this.toleranceMeters;
  }
}

export function mapNotionProject(page: any): Project {
  if (!("properties" in page)) {
    throw new Error("Invalid Notion page payload for project mapping");
  }
  const nameProp = page.properties["Name"];
  const slugProp = page.properties["Slug"];
  const latProp = page.properties["Latitude"];
  const longProp = page.properties["Longitude"];
  const radiusProp = page.properties["Radius (m)"];
  const statusProp = page.properties["Status"];

  return ProjectSchema.parse({
    id: page.id,
    name: nameProp?.type === "title" && nameProp.title[0] ? nameProp.title[0].plain_text : "Unnamed Project",
    slug: slugProp?.type === "rich_text" && slugProp.rich_text[0] ? slugProp.rich_text[0].plain_text : page.id,
    address: page.properties["Address"]?.type === "rich_text" && page.properties["Address"].rich_text[0]
      ? page.properties["Address"].rich_text[0].plain_text
      : undefined,
    latitude: latProp?.type === "number" ? latProp.number ?? null : null,
    longitude: longProp?.type === "number" ? longProp.number ?? null : null,
    geofenceRadiusMeters: radiusProp?.type === "number" && radiusProp.number ? radiusProp.number : 100,
    notionPageId: page.id,
    status: statusProp?.type === "select" && statusProp.select ? (statusProp.select.name.toLowerCase() as Project["status"]) : "active",
    updatedAt: new Date(page.last_edited_time),
    createdAt: "created_time" in page ? new Date(page.created_time) : new Date()
  });
}
