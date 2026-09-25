/**
 * Returns a favicon URL for a given site using Google's public favicon
 * service. Used by the SocialBar so icons stay accurate without bundling
 * per-platform SVGs.
 */
export function getFaviconUrl(rawUrl: string, size = 64): string {
  try {
    const { hostname } = new URL(rawUrl);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=${size}`;
  } catch {
    return "";
  }
}
