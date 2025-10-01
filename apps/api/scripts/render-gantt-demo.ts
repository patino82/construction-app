import { bootstrapContainer } from "../src/container";

async function main() {
  const services = await bootstrapContainer();
  const rows = await services.lookahead.buildLookAhead({
    weekStartIso: new Date().toISOString().slice(0, 10),
    idempotencyKey: `demo-${Date.now()}`
  });

  const result = await services.gantt.render(rows, {
    title: "Demo 3WLA",
    weekOf: new Date().toISOString().slice(0, 10)
  });

  console.log(`Rendered ${rows.length} rows to ${result.url.substring(0, 60)}...`);
  console.log(`Update config via PUT /api/config with urls.ganttPublicUrl = ${result.url}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
