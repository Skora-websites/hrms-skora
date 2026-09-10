/**
 * Shared browser download helper.
 *
 * Fetches an authenticated endpoint that returns file bytes and triggers a
 * real file download via a temporary object URL. Used by both the employee
 * hub offer-letter card and the My Offer Letters page so the behavior is
 * identical everywhere (the old window.open + document.write path corrupted
 * PDF bytes).
 */
export async function downloadFileFromUrl(
  url: string,
  filename: string
): Promise<{ ok: boolean; headers: Headers }> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return { ok: false, headers: res.headers };

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);

  return { ok: true, headers: res.headers };
}
