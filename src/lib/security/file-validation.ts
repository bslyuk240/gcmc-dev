import "server-only";

// file-type v16 is the last CommonJS-compatible release.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { fileTypeFromBuffer } = require("file-type") as {
  fileTypeFromBuffer: (buffer: Buffer | Uint8Array) => Promise<{ ext: string; mime: string } | undefined>;
};

// ─── Allowlists ──────────────────────────────────────────────────────────────

/** Image uploads: avatars, logos */
export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/** Logo uploads additionally permit SVG (text-based, handled separately) */
export const ALLOWED_LOGO_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]);

/** HR/staff document uploads */
export const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

// ─── Size constants ───────────────────────────────────────────────────────────

export const MAX_AVATAR_BYTES    = 5  * 1024 * 1024;  //  5 MB
export const MAX_LOGO_BYTES      = 2  * 1024 * 1024;  //  2 MB
export const MAX_DOCUMENT_BYTES  = 10 * 1024 * 1024;  // 10 MB

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * SVG is XML text — file-type cannot detect it via magic bytes.
 * We check for it separately before falling back to magic-byte detection.
 */
function isSvgBuffer(buf: Buffer): boolean {
  const head = buf.slice(0, 512).toString("utf8").trimStart();
  return head.startsWith("<?xml") || head.startsWith("<svg");
}

// ─── Core validator ───────────────────────────────────────────────────────────

export type MimeValidationResult =
  | { ok: true; mimeType: string }
  | { ok: false; error: string };

/**
 * Detect the actual MIME type of a file from its binary content (magic bytes)
 * and verify it against an allowlist.
 *
 * Never trusts the client-supplied `File.type` or the filename extension.
 *
 * @param buffer       Raw file bytes
 * @param allowedTypes Set of permitted MIME type strings
 * @param allowSvg     When true, SVG text-based detection is also applied
 */
export async function validateMimeType(
  buffer: Buffer,
  allowedTypes: Set<string>,
  allowSvg = false,
): Promise<MimeValidationResult> {
  // 1. SVG is XML text — handle before magic-byte detection.
  if (allowSvg && allowedTypes.has("image/svg+xml") && isSvgBuffer(buffer)) {
    return { ok: true, mimeType: "image/svg+xml" };
  }

  // 2. Detect actual type from magic bytes.
  const detected = await fileTypeFromBuffer(buffer);

  if (!detected) {
    return { ok: false, error: "File type could not be determined." };
  }

  if (!allowedTypes.has(detected.mime)) {
    // Safe to include the detected type in the error — it is not secret.
    return {
      ok: false,
      error: `File type "${detected.mime}" is not permitted. Allowed: ${[...allowedTypes].join(", ")}.`,
    };
  }

  return { ok: true, mimeType: detected.mime };
}

/**
 * Validate file size against a byte limit.
 * Check the Content-Length header first for an early-exit before buffering.
 */
export function validateContentLength(
  request: Request,
  maxBytes: number,
): { ok: true } | { ok: false; error: string; status: 413 } {
  const lengthHeader = request.headers.get("content-length");
  if (lengthHeader) {
    const declared = parseInt(lengthHeader, 10);
    if (!isNaN(declared) && declared > maxBytes) {
      return {
        ok: false,
        error: `File exceeds maximum allowed size of ${Math.round(maxBytes / 1024 / 1024)} MB.`,
        status: 413,
      };
    }
  }
  return { ok: true };
}

/**
 * Validate the actual buffer size after reading.
 */
export function validateBufferSize(
  buffer: ArrayBuffer,
  maxBytes: number,
): { ok: true } | { ok: false; error: string; status: 413 } {
  if (buffer.byteLength > maxBytes) {
    return {
      ok: false,
      error: `File exceeds maximum allowed size of ${Math.round(maxBytes / 1024 / 1024)} MB.`,
      status: 413,
    };
  }
  return { ok: true };
}
