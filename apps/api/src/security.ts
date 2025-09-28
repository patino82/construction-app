import { FastifyReply, FastifyRequest } from "fastify";
import env from "./env";

export async function requireAdminToken(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const headerToken = request.headers["x-admin-token"];

  if (headerToken !== env.ADMIN_API_TOKEN) {
    await reply.status(401).send({ error: "unauthorized" });
  }
}
