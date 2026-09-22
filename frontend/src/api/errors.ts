import { i18n } from "@/i18n";
import { ApiError } from "./http";

// Not a component, so useI18n() is unavailable here: reaching the global composer is the
// documented way to translate outside the component tree.
const { t } = i18n.global;

// The UI's own wording for each error code — which is exactly what the stable `code` on the
// wire is for: the server's prose never reaches the screen, so it never needs translating.
const MESSAGES: Record<string, string> = {
  "auth.invalidCredentials": "error.invalidCredentials",
  "auth.userNameTaken": "error.userNameTaken",
};

export function errorMessage(err: unknown): string {
  // fetch throws a TypeError when there is no response at all: API down, CORS, offline.
  if (err instanceof TypeError) return t("error.unreachable");
  if (!(err instanceof ApiError)) return t("error.unknown");
  // The one exception, and the limit of this design: Zod messages are prose built by the
  // server, under a single `request.invalidBody` code, so they stay in the server's language.
  if (err.code === "request.invalidBody") return err.message;
  const key = MESSAGES[err.code];
  return key ? t(key) : t("error.unknown");
}
