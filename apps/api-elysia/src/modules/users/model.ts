import { t } from "elysia";

export const UpdateUserBody = t.Object({
  name: t.Optional(t.String()),
  region: t.Optional(t.String()),
});
