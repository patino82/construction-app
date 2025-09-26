import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import env from "./env";
import logger from "./logger";

let sdk: NodeSDK | undefined;

export async function startTelemetry(): Promise<void> {
  if (!env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    logger.debug("OTEL exporter not configured, skipping telemetry startup");
    return;
  }

  sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: "execsuite-api",
      [SemanticResourceAttributes.SERVICE_VERSION]: "0.1.0"
    }),
    traceExporter: new OTLPTraceExporter({
      url: env.OTEL_EXPORTER_OTLP_ENDPOINT
    }),
    instrumentations: [getNodeAutoInstrumentations()]
  });

  await sdk.start();
  logger.info("Telemetry started");
}

export async function stopTelemetry(): Promise<void> {
  if (!sdk) return;
  await sdk.shutdown();
  logger.info("Telemetry stopped");
}
