import { t } from "elysia";

export const RegisterTokenBody = t.Object({
  token: t.String({ minLength: 1 }),
  platform: t.String({ minLength: 1 }),
});
