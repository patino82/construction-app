import { FastifyInstance } from "fastify";
import { DBIDS } from "../dbids";
import { ServiceContainer } from "../container";
import { mapNotionProject } from "@execsuite/core";

export async function registerProjectRoutes(app: FastifyInstance, services: ServiceContainer): Promise<void> {
  app.get("/api/projects", async (_request, reply) => {
    const projects = await services.notion.listDatabase(DBIDS.PROJECTS, mapNotionProject);
    return reply.send({ projects });
  });
}
