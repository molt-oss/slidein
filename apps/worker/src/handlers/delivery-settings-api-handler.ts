/**
 * Delivery Settings API Handler — 配信時間帯制御
 */
import { Hono } from "hono";
import { z } from "zod";
import { structuredLog } from "@slidein/shared";
import type { Env } from "../config/env.js";
import { DeliverySettingsRepository } from "../messaging/delivery-settings-repository.js";
import { bearerAuth } from "../middleware/auth.js";

const deliverySettingsApi = new Hono<{ Bindings: Env }>();

deliverySettingsApi.use("/api/*", bearerAuth());

const UpdateDeliverySettingsSchema = z.object({
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(1).max(24),
  timezone: z.string().min(1).max(100),
});

deliverySettingsApi.get("/api/delivery-settings", async (c) => {
  const repo = new DeliverySettingsRepository(c.env.DB);
  const settings = await repo.get();
  return c.json({ data: settings });
});

deliverySettingsApi.put("/api/delivery-settings", async (c) => {
  const body = await c.req.json();
  const parseResult = UpdateDeliverySettingsSchema.safeParse(body);

  if (!parseResult.success) {
    return c.json({ error: parseResult.error.flatten() }, 400);
  }

  const { startHour, endHour, timezone } = parseResult.data;
  if (startHour >= endHour) {
    return c.json({ error: "startHour must be less than endHour" }, 400);
  }

  const repo = new DeliverySettingsRepository(c.env.DB);
  const updated = await repo.update(startHour, endHour, timezone);

  structuredLog("info", "Delivery settings updated", {
    startHour,
    endHour,
    timezone,
  });
  return c.json({ data: updated });
});

export { deliverySettingsApi };
