import { File, Paths } from 'expo-file-system';
import type { Puzzle, PuzzleObject } from '@/lib/state/puzzleStore';

// Thrown when a downloaded puzzle image can't be written to local storage
// (e.g. the device is out of space). Callers can show a specific message
// instead of a generic "not found / connection" error.
export class ChallengeSaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChallengeSaveError';
  }
}

type ChallengePayload = {
  version: 1;
  challengeId: string;
  puzzle: {
    title: string;
    imageData: string; // base64
    imageWidth: number;
    imageHeight: number;
    objects: PuzzleObject[];
  };
  challengerName: string;
  challengerTime: number;
  message?: string;
  isRemix?: boolean;
  remixedBy?: string;
};

export function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function buildPayload(
  puzzle: Puzzle,
  imageData: string,
  challengerName: string,
  challengerTime: number,
  message?: string,
  remixMeta?: { isRemix: true; remixedBy: string }
): ChallengePayload {
  return {
    version: 1,
    challengeId: generateId(),
    puzzle: {
      title: puzzle.title,
      imageData,
      imageWidth: puzzle.imageWidth,
      imageHeight: puzzle.imageHeight,
      objects: puzzle.objects,
    },
    challengerName,
    challengerTime,
    message: message || undefined,
    ...(remixMeta ?? {}),
  };
}

// Upload challenge to backend, return a short 6-char code
export async function uploadChallenge(
  puzzle: Puzzle,
  challengerName: string,
  challengerTime: number,
  message?: string,
  remixMeta?: { isRemix: true; remixedBy: string }
): Promise<string> {
  const imageFile = new File(puzzle.imageUri);
  const imageBytes = await imageFile.bytes();
  const imageData = uint8ArrayToBase64(imageBytes);

  const payload = buildPayload(puzzle, imageData, challengerName, challengerTime, message, remixMeta);
  const payloadStr = JSON.stringify(payload);

  const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
  const res = await fetch(`${baseUrl}/api/challenges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload: payloadStr }),
  });

  if (!res.ok) throw new Error('Failed to upload challenge');
  const json = await res.json() as { data: { code: string } };
  return json.data.code;
}

// Fetch challenge from backend by short code and decode to Puzzle
export async function fetchAndDecodeChallenge(code: string): Promise<Puzzle | null> {
  let payloadStr: string;
  try {
    const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
    const res = await fetch(`${baseUrl}/api/challenges/${code.trim().toUpperCase()}`);
    if (!res.ok) return null;
    const json = await res.json() as { data: { payload: string } };
    payloadStr = json.data.payload;
  } catch {
    return null;
  }
  // Decode (which writes the image to disk) runs outside the network try/catch
  // so a ChallengeSaveError surfaces to the caller instead of being mistaken
  // for a missing puzzle.
  return decodePayloadString(payloadStr);
}

function decodePayloadString(payloadStr: string): Puzzle | null {
  // A malformed/unsupported payload is "not found" → return null. Keep this
  // separate from the image-write step so a real save failure isn't silently
  // swallowed as a missing puzzle.
  let payload: ChallengePayload;
  try {
    payload = JSON.parse(payloadStr) as ChallengePayload;
  } catch {
    return null;
  }
  if (payload.version !== 1) return null;

  let imageUri: string;
  try {
    const filename = `challenge_${payload.challengeId}_${Date.now()}.jpg`;
    const imageFile = new File(Paths.document, filename);
    imageFile.write(payload.puzzle.imageData, { encoding: 'base64' });
    imageUri = imageFile.uri;
  } catch {
    throw new ChallengeSaveError(
      "Couldn't save the puzzle to your device. You may be low on storage — free up some space and try again."
    );
  }

  return {
    id: `${payload.challengeId}_imported`,
    title: payload.isRemix
      ? `Remixed by ${payload.remixedBy ?? payload.challengerName}`
      : `Challenge from ${payload.challengerName}`,
    imageUri,
    imageWidth: payload.puzzle.imageWidth,
    imageHeight: payload.puzzle.imageHeight,
    objects: payload.puzzle.objects,
    createdAt: Date.now(),
    challengeId: payload.challengeId,
    challengerName: payload.challengerName,
    challengerTime: payload.challengerTime,
    challengeMessage: payload.message,
    isRemix: payload.isRemix,
    remixedBy: payload.remixedBy,
  };
}

// Keep for backward compatibility with old long-code imports
export async function encodeChallengePayload(
  puzzle: Puzzle,
  challengerName: string,
  challengerTime: number,
  message?: string,
  remixMeta?: { isRemix: true; remixedBy: string }
): Promise<string> {
  return uploadChallenge(puzzle, challengerName, challengerTime, message, remixMeta);
}

export async function decodeChallengePayload(encoded: string): Promise<Puzzle | null> {
  const trimmed = encoded.trim();
  // Short code: 4-8 alphanumeric chars → fetch from backend
  if (/^[A-Z0-9]{4,8}$/i.test(trimmed)) {
    return fetchAndDecodeChallenge(trimmed);
  }
  // Legacy long base64 code — try to decode locally
  try {
    const json = decodeURIComponent(
      atob(trimmed)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return decodePayloadString(json);
  } catch (e) {
    if (e instanceof ChallengeSaveError) throw e;
    return null;
  }
}
