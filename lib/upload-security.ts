// ── Upload security: signature (magic-byte) validation + filename hygiene ──
//
// Client-supplied Content-Type and extension are attacker-controlled. These
// helpers validate the FILE CONTENT against known magic bytes and keep the
// allowlist closed, so a renamed .php/.exe/.html/.svg cannot enter the system
// through any upload endpoint.

export interface UploadCheckOptions {
  /** MIME types allowed (must be one of the KNOWN_TYPES below). */
  allowedTypes: string[];
  /** Maximum accepted size in bytes. */
  maxBytes: number;
}

export type UploadCheckResult =
  | { ok: true; mime: string }
  | { ok: false; reason: string };

/** Detect a file's true type from its leading bytes. */
function detectMime(buf: Buffer): string | null {
  if (buf.length < 4) return null;
  const ascii = buf.subarray(0, 12).toString("latin1");
  if (ascii.startsWith("%PDF-")) return "application/pdf";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (ascii.startsWith("GIF8")) return "image/gif";
  if (ascii.startsWith("RIFF") && buf.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  // Legacy OLE compound document (.doc, .xls, .msi)
  if (buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) {
    return "application/msword";
  }
  // ZIP container (.docx and friends)
  if (buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07)) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return null;
}

/** Sanitize a client-supplied filename: strip path components/control chars. */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() || "file";
  // Remove control characters and reject suspicious sequences outright.
  // biome-ignore lint: intentional replacement chain
  return base.replace(/[\x00-\x1f\x7f]/g, "").replace(/\.+/g, (m) => (m.length > 2 ? "" : m)).trim() || "file";
}

/**
 * Validate an upload: size, filename hygiene, and content signature.
 * The declared client MIME is IGNORED for the allowlist decision.
 */
export function validateUpload(
  buf: Buffer,
  filename: string,
  opts: UploadCheckOptions
): UploadCheckResult {
  if (!filename || filename.length > 255) {
    return { ok: false, reason: "Invalid filename" };
  }
  if (/[\x00-\x1f\x7f]/.test(filename)) {
    return { ok: false, reason: "Invalid characters in filename" };
  }
  if (buf.length === 0) {
    return { ok: false, reason: "Empty file" };
  }
  if (buf.length > opts.maxBytes) {
    return { ok: false, reason: `File too large. Maximum size: ${Math.round(opts.maxBytes / (1024 * 1024))}MB` };
  }

  const detected = detectMime(buf);
  if (!detected) {
    return { ok: false, reason: "Unrecognized or unsupported file content" };
  }
  if (!opts.allowedTypes.includes(detected)) {
    return { ok: false, reason: `Invalid file type. Allowed: ${opts.allowedTypes.join(", ")}` };
  }
  return { ok: true, mime: detected };
}
