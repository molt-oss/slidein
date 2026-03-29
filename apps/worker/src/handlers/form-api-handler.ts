/**
 * Form API Handler — フォーム管理
 */
import { Hono } from "hono";
import { structuredLog } from "@slidein/shared";
import type { Env } from "../config/env.js";
import { FormService } from "../forms/service.js";
import { CreateFormSchema } from "../forms/types.js";
import { bearerAuth } from "../middleware/auth.js";

const formApi = new Hono<{ Bindings: Env }>();

formApi.use("/api/*", bearerAuth());

function createService(env: Env): FormService {
  return new FormService({
    db: env.DB,
    accessToken: env.META_ACCESS_TOKEN,
    igAccountId: env.IG_ACCOUNT_ID,
  });
}

formApi.get("/api/forms", async (c) => {
  const service = createService(c.env);
  const forms = await service.listForms();
  return c.json({ data: forms });
});

formApi.post("/api/forms", async (c) => {
  const body = await c.req.json();
  const parseResult = CreateFormSchema.safeParse(body);

  if (!parseResult.success) {
    return c.json({ error: parseResult.error.flatten() }, 400);
  }

  const service = createService(c.env);
  const form = await service.createForm(parseResult.data);

  structuredLog("info", "Form created via API", { formId: form.id });
  return c.json({ data: form }, 201);
});

formApi.get("/api/forms/:id/responses", async (c) => {
  const id = c.req.param("id");
  const service = createService(c.env);
  const responses = await service.getResponses(id);
  return c.json({ data: responses });
});

formApi.delete("/api/forms/:id", async (c) => {
  const id = c.req.param("id");
  const service = createService(c.env);
  const deleted = await service.deleteForm(id);

  if (!deleted) {
    return c.json({ error: "Not found" }, 404);
  }

  structuredLog("info", "Form deleted via API", { formId: id });
  return c.json({ success: true });
});

export { formApi };
