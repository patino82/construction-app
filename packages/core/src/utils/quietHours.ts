import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { QuietHoursConfig } from "../schemas/adminSettings";

dayjs.extend(utc);
dayjs.extend(timezone);

export function isWithinQuietHours(config: QuietHoursConfig, now = dayjs()): boolean {
  const tzNow = now.tz(config.tz);
  const currentMinutes = toMinutes(tzNow.hour(), tzNow.minute());
  const startMinutes = parseQuietTime(config.start);
  const endMinutes = parseQuietTime(config.end);

  if (startMinutes === endMinutes) {
    return false;
  }

  if (endMinutes > startMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  // Overnight quiet hours (e.g. 20:00-06:00)
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

function parseQuietTime(value: string): number {
  const [hours, minutes] = value.split(":").map((part) => Number.parseInt(part, 10));
  return toMinutes(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0);
}

function toMinutes(hours: number, minutes: number): number {
  return (hours * 60 + minutes) % (24 * 60);
}

export function shouldBypassQuietHours(config: QuietHoursConfig, topic: string): boolean {
  return config.allow.includes(topic.toUpperCase());
}
