/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Google Drive "share" links (/file/d/ID/view, ?id=ID) point to an HTML
 * preview page, not the raw image bytes — pasted as-is into <img src>
 * they fail to render. This rewrites them to the direct-serving
 * lh3.googleusercontent.com form. Non-Drive URLs pass through unchanged.
 */
export function normalizeImageUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  if (/^https?:\/\/(drive|docs)\.google\.com\//i.test(trimmed)) {
    const fileIdMatch =
      trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
      trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch) {
      return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
    }
  }

  return trimmed;
}
