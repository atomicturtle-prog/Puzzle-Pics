import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { ChallengeSaveError, decodeChallengePayload } from '@/lib/challenge';
import { R, stickerStyle } from '@/lib/retro';
import usePuzzleStore from '@/lib/state/puzzleStore';

/**
 * Deep-link entry point.
 *
 * Shared links look like `vibecode://puzzle/ABC123` (custom scheme) or
 * `https://<backend>/puzzle/ABC123` (web landing page, which bounces into the
 * scheme). Either way the app opens here. We fetch the puzzle for the shared
 * code, save it, and drop the recipient straight into the game — no copy/paste.
 *
 * `unstable_settings.initialRouteName = 'index'` in the root layout anchors the
 * Home screen beneath this route, so the back button still works.
 */
export default function PuzzleDeepLink() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const clean = (code ?? '').toString().trim().toUpperCase();

  const addPuzzle = usePuzzleStore((s) => s.addPuzzle);
  const puzzles = usePuzzleStore((s) => s.puzzles);

  const [error, setError] = useState<string | null>(null);
  const triedRef = useRef(false);

  useEffect(() => {
    if (triedRef.current) return;
    triedRef.current = true;

    if (!clean) {
      setError('This link is missing a puzzle code.');
      return;
    }

    (async () => {
      try {
        const puzzle = await decodeChallengePayload(clean);
        if (!puzzle) {
          setError(`We couldn't find puzzle "${clean}". It may have expired.`);
          return;
        }
        const exists = puzzles.some((p) => p.id === puzzle.id);
        if (!exists) addPuzzle(puzzle);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        // Anchor Home beneath, then open the puzzle full-screen.
        router.replace('/');
        router.push(`/play/${puzzle.id}`);
      } catch (e) {
        if (e instanceof ChallengeSaveError) {
          setError(e.message);
        } else {
          setError('Something went wrong loading this puzzle. Check your connection and try again.');
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clean]);

  return (
    <View
      testID="puzzle-deeplink-screen"
      style={{ flex: 1, backgroundColor: R.BG, alignItems: 'center', justifyContent: 'center', padding: 28 }}
    >
      {error ? (
        <View style={{ alignItems: 'center', gap: 18 }}>
          <Text style={{ fontSize: 48 }}>🕵️</Text>
          <Text style={{ color: R.WHITE, fontSize: 24, fontFamily: 'Boogaloo_400Regular', textAlign: 'center' }}>
            PUZZLE NOT FOUND
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
            {error}
          </Text>
          <Pressable testID="deeplink-enter-code" onPress={() => router.replace('/import-challenge')}>
            <View style={{ ...stickerStyle(R.PINK, 14), paddingHorizontal: 24, paddingVertical: 14 }}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 }}>
                ENTER CODE MANUALLY
              </Text>
            </View>
          </Pressable>
          <Pressable testID="deeplink-home" onPress={() => router.replace('/')}>
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>← Back to home</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ alignItems: 'center', gap: 16 }}>
          <ActivityIndicator color={R.YELLOW} size="large" />
          <Text style={{ color: R.WHITE, fontSize: 20, fontFamily: 'Boogaloo_400Regular', letterSpacing: 0.5 }}>
            LOADING PUZZLE{clean ? ` ${clean}` : ''}…
          </Text>
        </View>
      )}
    </View>
  );
}
