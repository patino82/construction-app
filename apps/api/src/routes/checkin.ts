import { FastifyInstance } from "fastify";
import { z } from "zod";
import env from "../env";
import { DBIDS } from "../dbids";
import { ServiceContainer } from "../container";
import { mapNotionProject } from "@execsuite/core";
import { requireAdminToken } from "../security";

const CheckInBodySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().positive().optional(),
  timestamp: z.coerce.date().optional()
});

export async function registerCheckInRoute(app: FastifyInstance, services: ServiceContainer): Promise<void> {
  app.post("/api/checkin", { preHandler: requireAdminToken }, async (request, reply) => {
    const payload = CheckInBodySchema.parse(request.body);

    const projects = await services.notion.listDatabase(DBIDS.PROJECTS, mapNotionProject);
    const nearest = services.geo.findNearestProject({ latitude: payload.latitude, longitude: payload.longitude }, projects);

    if (!nearest) {
      return reply.status(404).send({ error: "no_project", message: "No project found" });
    }

    const withinFence = services.geo.isWithinGeofence({ latitude: payload.latitude, longitude: payload.longitude }, nearest.project);

    if (!withinFence) {
      return reply.status(403).send({ error: "outside_geofence", distanceMeters: nearest.distanceMeters });
    }

    const checkInTime = payload.timestamp ?? new Date();
    const dailyLog = await services.dailyLogs.getOrCreateDailyLog(nearest.project.id, checkInTime);
    const updatedLog = await services.dailyLogs.addCheckIn(dailyLog, {
      projectId: nearest.project.id,
      gps: {
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracyMeters: payload.accuracyMeters
      },
      timestamp: checkInTime
    });

    if (services.telegram) {
      await services.telegram.sendTopicMessage("LOGS", `Check-in at ${nearest.project.name} (${nearest.distanceMeters.toFixed(1)}m from center)`);
    }

    if (env.FO_CHECKIN_WEBHOOK) {
      await fetch(env.FO_CHECKIN_WEBHOOK, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          event: "FO_CHECKIN",
          project: nearest.project.name,
          dailyLogId: updatedLog.id,
          timestamp: checkInTime.toISOString(),
          gps: payload
        })
      });
    }

    return reply.send({
      project: nearest.project,
      distanceMeters: nearest.distanceMeters,
      dailyLog: updatedLog
    });
  });
}
