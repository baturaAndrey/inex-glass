import { getPayload } from "payload";
import { leadSubmitSchema } from "@/lib/domain";
import { getEnv } from "@/lib/env";
import { isHoneypotTripped, verifyFormToken } from "@/lib/leads/antispam";
import { getClientIp } from "@/lib/leads/client-ip";
import {
  createLead,
  LeadIntakeError,
  pageUrlFromReferer,
  submissionContacts,
} from "@/lib/leads/create-lead";
import { enqueueNotifyNewLead } from "@/lib/leads/enqueue";
import { RATE_LIMITS, rateLimit, rateLimitKeys } from "@/lib/leads/rate-limit";
import { jsonError, jsonOk, jsonSubmitError } from "@/lib/leads/responses";
import type { IntakeErrorCode } from "@/lib/leads/responses";
import config from "@payload-config";
import type { Payload } from "payload";
import type { z } from "zod";

/**
 * `POST /api/forms/lead/` (trailing slash!) — lead submission of every public form.
 *
 * Body: JSON matching `leadSubmitSchema` (`@/lib/domain`). Response: `{ ok: true, leadId }`, or
 * `{ ok: false, code, message, fields? }` (codes/statuses in `@/lib/leads/responses`).
 * Order: body limit → JSON → honeypot (silent 200) → schema → form token → rate limits (IP,
 * phone, e-mail) → `createLead` (one transaction) → queue `notify-new-lead` (never fails the lead).
 *
 * NOT `/api/leads/`: that path is Payload's REST endpoint of the `leads` collection.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 200 * 1024;

type BodyRead = { ok: true; text: string } | { ok: false };

/** Reads the body as UTF-8, giving up as soon as it exceeds `MAX_BODY_BYTES`. */
async function readBodyLimited(request: Request): Promise<BodyRead> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return { ok: false };
  if (!request.body) return { ok: false };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return { ok: false };
    }
    chunks.push(value);
  }
  return { ok: true, text: Buffer.concat(chunks).toString("utf8") };
}

/** First zod message per field path (`answers.contact.phone`, `consent`, …). */
function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_";
    fields[key] ??= issue.message;
  }
  return fields;
}

/** Phone exactly as typed (for `leads.phoneRaw`); the parsed data holds the normalized one. */
function rawPhoneOf(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;
  const answers = record.answers as { contact?: { phone?: unknown } } | undefined;
  const phone = record.formType === "quiz" ? answers?.contact?.phone : record.phone;
  return typeof phone === "string" ? phone : null;
}

/**
 * Loggable summary without personal data: the error name and, for Payload validation errors, the
 * failing field paths only (their messages may echo submitted values).
 */
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return "unknown";
  const errors = (error as { data?: { errors?: Array<{ path?: unknown }> } }).data?.errors;
  const paths = Array.isArray(errors) ? errors.map((item) => String(item.path)).join(",") : "";
  return paths ? `${error.name} [${paths}]` : error.name;
}

const TOKEN_ERROR_CODES: Record<"bad" | "too_fast" | "expired", IntakeErrorCode> = {
  bad: "token",
  too_fast: "too_fast",
  expired: "expired",
};

export async function POST(request: Request): Promise<Response> {
  let payload: Payload | null = null;
  try {
    const body = await readBodyLimited(request);
    if (!body.ok) return jsonSubmitError("bad_request", null);

    let json: unknown;
    try {
      json = JSON.parse(body.text);
    } catch {
      return jsonSubmitError("bad_request", null);
    }

    // Bots get a success answer and nothing is stored.
    if (isHoneypotTripped(json)) return jsonOk({});

    const parsed = leadSubmitSchema.safeParse(json);
    if (!parsed.success) {
      const fields = fieldErrors(parsed.error);
      const message = Object.values(fields)[0] ?? "";
      return jsonError("validation", message, { fields });
    }
    const data = parsed.data;

    payload = await getPayload({ config });

    const tokenCheck = verifyFormToken(data.formToken);
    if (!tokenCheck.ok) return jsonSubmitError(TOKEN_ERROR_CODES[tokenCheck.reason], payload);

    const ip = getClientIp(request.headers);
    const contacts = submissionContacts(data);
    const limitKeys = [
      rateLimitKeys.leadIp(ip),
      rateLimitKeys.leadPhone(contacts.phone.replace(/\D/g, "")),
      ...(contacts.email ? [rateLimitKeys.leadEmail(contacts.email)] : []),
    ];
    for (const key of limitKeys) {
      const limit = await rateLimit({ key, ...RATE_LIMITS.lead }, payload);
      if (!limit.allowed) {
        return jsonSubmitError("rate", payload, { retryAfterSec: limit.retryAfterSec });
      }
    }

    const { leadId } = await createLead(payload, data, {
      ip,
      userAgent: request.headers.get("user-agent") ?? "",
      pageUrl: pageUrlFromReferer(request.headers.get("referer"), getEnv().SITE_URL),
      phoneRaw: rawPhoneOf(json),
    });

    await enqueueNotifyNewLead(payload, leadId);
    return jsonOk({ leadId });
  } catch (error) {
    if (error instanceof LeadIntakeError) {
      const message = Object.values(error.fields)[0] ?? "";
      return jsonError("validation", message, { fields: error.fields });
    }
    console.error("[forms/lead] failed:", describeError(error));
    return jsonSubmitError("server", payload);
  }
}
