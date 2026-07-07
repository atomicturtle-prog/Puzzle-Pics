import * as Linking from 'expo-linking';

// ── Sharing links ────────────────────────────────────────────────────────────
// Puzzle codes are shared as a tappable web link. The web link points at the
// backend landing page, which (if the app is installed) bounces the visitor
// straight into the app via the custom URL scheme, and otherwise sends them to
// the App Store.

// Live App Store listing for Puzzle Pics: Hidden Hunt.
export const APP_STORE_URL =
  'https://apps.apple.com/us/app/puzzle-pics-hidden-hunt/id6775047272';

// The custom scheme deep link (works when the app is already installed).
export function buildSchemeLink(code: string): string {
  return Linking.createURL(`/puzzle/${code}`);
}

// A tappable https link that opens the puzzle directly (via the backend landing
// page) when the app is installed, or routes to the App Store when it is not.
export function buildPlayLink(code: string): string {
  const base = process.env.EXPO_PUBLIC_BACKEND_URL?.replace(/\/+$/, '') ?? '';
  if (base) return `${base}/puzzle/${code}`;
  // No web base configured — fall back to the raw scheme link.
  return buildSchemeLink(code);
}

// The friendly share message that goes into the native iOS Share Sheet.
export function buildShareMessage(opts: {
  code: string;
  senderName?: string;
  isRemix?: boolean;
}): string {
  const { code, senderName, isRemix } = opts;
  const link = buildPlayLink(code);

  const who = senderName?.trim();
  const intro = isRemix
    ? `${who ? `${who} ` : ''}remixed a Puzzle Pics: Hidden Hunt puzzle for you!`
    : `${who ? `${who} made` : 'I made'} a Puzzle Pics: Hidden Hunt puzzle for you!`;

  return [
    intro,
    '',
    `Tap here to play: ${link}`,
    '',
    `Or download the app: ${APP_STORE_URL}`,
    '',
    `Puzzle Code: ${code}`,
  ].join('\n');
}
