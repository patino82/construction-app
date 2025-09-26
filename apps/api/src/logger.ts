import pino from "pino";
import env from "./env";

const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: ["req.headers.authorization", "env", "config.secrets", "webhook.url"],
    remove: true
  }
});

export default logger;
