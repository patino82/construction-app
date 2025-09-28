import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { describe, expect, it } from "vitest";
import { isWithinQuietHours, shouldBypassQuietHours } from "../utils/quietHours";

dayjs.extend(utc);
dayjs.extend(timezone);

describe("quiet hours", () => {
  const config = {
    start: "20:00",
    end: "06:00",
    tz: "America/New_York",
    allow: ["ALERTS", "OPS"]
  };

  it("identifies time inside quiet hours", () => {
    const sample = dayjs.tz("2024-04-05T02:00:00", config.tz);
    expect(isWithinQuietHours(config, sample)).toBe(true);
  });

  it("identifies time outside quiet hours", () => {
    const sample = dayjs.tz("2024-04-05T12:00:00", config.tz);
    expect(isWithinQuietHours(config, sample)).toBe(false);
  });

  it("allows bypass topics", () => {
    expect(shouldBypassQuietHours(config, "alerts")).toBe(true);
    expect(shouldBypassQuietHours(config, "marketing")).toBe(false);
  });
});
