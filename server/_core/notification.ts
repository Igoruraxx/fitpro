import { TRPCError } from "@trpc/server";
import { ENV } from "./env";
import { sendEmail } from "../email";
import { getUserById, getUserByOpenId } from "../db";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const trimValue = (value: string): string => value.trim();
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const buildEndpointUrl = (baseUrl: string): string => {
  const normalizedBase = baseUrl.endsWith("/")
    ? baseUrl
    : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};

const validatePayload = (input: NotificationPayload): NotificationPayload => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required.",
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required.",
    });
  }

  const title = trimValue(input.title);
  const content = trimValue(input.content);

  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`,
    });
  }

  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`,
    });
  }

  return { title, content };
};

/**
 * Dispatches a project-owner notification through the Manus Notification Service.
 * If Manus service is unavailable, it falls back to sending an email via Resend
 * to the owner defined in ENV.ownerOpenId (if it's a numeric ID).
 *
 * Returns `true` if the notification was delivered (Manus or Email), `false` otherwise.
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  const { title, content } = validatePayload(payload);

  // 1. Try Manus Notification Service first
  if (ENV.forgeApiUrl && ENV.forgeApiKey) {
    const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${ENV.forgeApiKey}`,
          "content-type": "application/json",
          "connect-protocol-version": "1",
        },
        body: JSON.stringify({ title, content }),
      });

      if (response.ok) {
        return true;
      }

      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Manus service failed (${response.status})${detail ? `: ${detail}` : ""}`
      );
    } catch (error) {
      console.warn("[Notification] Error calling Manus service:", error);
    }
  }

  // 2. Fallback to Email if Manus fails or is not configured
  // We need the owner's email. We'll try to get it from the database using ownerOpenId.
  try {
    let owner = null;
    const ownerId = parseInt(ENV.ownerOpenId);

    if (!isNaN(ownerId)) {
      owner = await getUserById(ownerId);
    } else if (ENV.ownerOpenId) {
      owner = await getUserByOpenId(ENV.ownerOpenId);
    }

    if (owner && owner.email) {
      console.log(`[Notification] Falling back to email for owner: ${owner.email}`);
      return await sendEmail({
        to: owner.email,
        subject: `[FITPRO] ${title}`,
        html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2>${title}</h2>
              <div style="white-space: pre-wrap; margin-top: 10px; color: #333;">${content}</div>
              <hr style="margin-top: 20px; border: 0; border-top: 1px solid #eee;" />
              <p style="font-size: 12px; color: #999;">Esta é uma notificação automática do sistema FITPRO.</p>
            </div>
          `,
        text: `${title}\n\n${content}`,
      });
    }
  } catch (err) {
    console.error("[Notification] Fallback email failed:", err);
  }

  console.warn("[Notification] All notification methods failed.");
  return false;
}
