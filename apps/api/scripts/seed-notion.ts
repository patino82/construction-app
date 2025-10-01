import env from "../src/env";
import { bootstrapContainer } from "../src/container";

async function main() {
  const services = await bootstrapContainer();
  const settings = await services.config.getAdminSettings().catch(async () => {
    console.log("No admin settings found; creating default row via Notion UI is required before seeding.");
    process.exit(1);
  });

  await services.config.updateAdminSettings({
    featureFlags: {
      ...settings.featureFlags,
      dashboard: true,
      threeWeekLookAhead: true,
      telegram: true
    },
    urls: settings.urls
  });

  console.log("Admin feature flags updated");
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
