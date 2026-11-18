import Image from "next/image";
import { mediaUrl } from "@/lib/media/media-url";
import { cn } from "@/lib/utils";
import { userInitials } from "../nav/inex-nav";
import type { Payload, ServerProps } from "payload";

/** Same box as Payload's default account icon (`graphic-account`, 25 × 25), so the header keeps its layout. */
const AVATAR_SIZE = 25;
/** Admin route of the account view (`admin.routes.account` default, not overridden in the config). */
const ACCOUNT_SEGMENT = "account";

type MediaDoc = {
  url?: string | null;
  updatedAt?: string | null;
  mimeType?: string | null;
  sizes?: { thumbnail?: { url?: string | null } | null } | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * The `photo` of the user as a media document. Payload authenticates with `auth.depth` 0, so the
 * upload usually arrives as an id and is read here; a populated document is used as is.
 * Any failure (deleted file, no access) falls back to the initials.
 */
async function resolvePhoto(payload: Payload, photo: unknown): Promise<MediaDoc | null> {
  if (isRecord(photo)) return photo as MediaDoc;
  if (typeof photo !== "string" || photo === "") return null;
  try {
    const doc = await payload.findByID({
      collection: "media",
      id: photo,
      depth: 0,
      disableErrors: true,
    });
    return doc ? (doc as MediaDoc) : null;
  } catch {
    return null;
  }
}

/** Site URL of the smallest variant (`thumbnail`, 400 px) of an image, else of the original. */
function photoSrc(doc: MediaDoc | null): string | null {
  if (!doc || (typeof doc.mimeType === "string" && !doc.mimeType.startsWith("image/"))) {
    return null;
  }
  return mediaUrl(doc.sizes?.thumbnail?.url ?? doc.url, doc.updatedAt);
}

function isAccountView(params: ServerProps["params"]): boolean {
  const segments = params?.segments;
  return Array.isArray(segments) && segments.length === 1 && segments[0] === ACCOUNT_SEGMENT;
}

/**
 * Account avatar in the admin top bar (`admin.avatar.Component`; the export name and path are a
 * contract with `payload.config.ts`). The user's photo when set, otherwise the initials like the
 * sidebar user card. Payload wraps it in a link labelled «Аккаунт», so the picture is decorative.
 */
export async function AdminAvatar({ params, payload, user }: ServerProps) {
  if (!user) return null;
  const record = user as unknown as { name?: unknown; email?: unknown; photo?: unknown };
  const name = typeof record.name === "string" ? record.name : "";
  const email = typeof record.email === "string" ? record.email : "";
  const src = photoSrc(await resolvePhoto(payload, record.photo));
  const className = cn("iga-avatar iga-avatar--header", isAccountView(params) && "is-active");

  if (src) {
    return (
      <span className={className} aria-hidden="true">
        <Image
          className="iga-avatar__img"
          src={src}
          alt=""
          width={AVATAR_SIZE}
          height={AVATAR_SIZE}
        />
      </span>
    );
  }
  return (
    <span className={className} aria-hidden="true">
      {userInitials(name, email)}
    </span>
  );
}
