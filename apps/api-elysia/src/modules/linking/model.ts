import { t } from "elysia";

export const LinkRetailerBody = t.Object({
  code: t.String({ minLength: 1 }),
  method: t.Union([t.Literal("INVITE_LINK"), t.Literal("QR_CODE"), t.Literal("MANUAL_CODE")]),
});
