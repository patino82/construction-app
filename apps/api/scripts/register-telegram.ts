import { bootstrapContainer } from "../src/container";

async function main() {
  const services = await bootstrapContainer();
  const settings = await services.config.getAdminSettings(true);
  services.refreshTelegram(settings);

  if (!services.telegram) {
    console.log("Telegram not configured; set TELEGRAM_BOT_TOKEN to enable");
    process.exit(0);
  }

  await services.telegram.registerCommands();
  console.log("Telegram commands registered");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
