import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { ClipboardPaste, Download, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChallengeSaveError, decodeChallengePayload } from '@/lib/challenge';
import { isTablet, MAX_MODAL_WIDTH } from '@/lib/device';
import { R, stickerStyle } from '@/lib/retro';
import usePuzzleStore from '@/lib/state/puzzleStore';

export default function ImportChallengeScreen() {
  const insets = useSafeAreaInsets();
  const addPuzzle = usePuzzleStore((s) => s.addPuzzle);
  const puzzles = usePuzzleStore((s) => s.puzzles);

  // A code can arrive via a shared deep link (puzzle/[code] redirects here).
  const { code: codeParam } = useLocalSearchParams<{ code?: string }>();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoTriedRef = useRef(false);

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) setCode(text.trim());
    } catch {
      // ignore
    }
  };

  const importCode = async (raw: string) => {
    const trimmed = raw.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const puzzle = await decodeChallengePayload(trimmed);
      if (!puzzle) {
        setError('Code not found or expired. Check the code and try again.');
        return;
      }
      const exists = puzzles.some((p) => p.id === puzzle.id);
      if (!exists) addPuzzle(puzzle);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      // Close the sheet and jump straight into the shared puzzle.
      router.back();
      router.push(`/play/${puzzle.id}`);
    } catch (e) {
      if (e instanceof ChallengeSaveError) {
        setError(e.message);
      } else {
        setError('Something went wrong. Make sure you have a connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => importCode(code);

  // Auto-populate + auto-load when opened from a shared link.
  useEffect(() => {
    const incoming = codeParam?.trim().toUpperCase();
    if (incoming && !autoTriedRef.current) {
      autoTriedRef.current = true;
      setCode(incoming);
      importCode(incoming);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeParam]);

  return (
    <View
      testID="import-challenge-screen"
      style={{ flex: 1, backgroundColor: '#0B0B14', paddingBottom: insets.bottom + 16, alignItems: isTablet ? 'center' : undefined, justifyContent: isTablet ? 'center' : undefined }}
    >
      <View style={{ width: '100%', maxWidth: isTablet ? MAX_MODAL_WIDTH : undefined }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{
              width: 38, height: 38,
              alignItems: 'center', justifyContent: 'center',
              ...stickerStyle(R.PINK, 10),
            }}>
              <Download size={18} color="#fff" />
            </View>
            <Text style={{ color: '#fff', fontSize: 22, fontFamily: 'Boogaloo_400Regular', letterSpacing: 0.5 }}>
              ENTER CHALLENGE
            </Text>
          </View>
          <Pressable
            testID="import-close"
            onPress={() => router.back()}
            style={{
              width: 36, height: 36, borderRadius: 10,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.07)',
              borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)',
            }}
          >
            <X size={18} color="rgba(255,255,255,0.55)" />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20, justifyContent: 'center', gap: 32, paddingVertical: isTablet ? 32 : 0 }}>
          {/* Instruction */}
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: isTablet ? 17 : 15, textAlign: 'center', lineHeight: 24 }}>
              Got a challenge from a friend?{'\n'}Enter their 6-character code below.
            </Text>
          </View>

          {/* Code input */}
          <View style={{ gap: 12 }}>
            <TextInput
              testID="challenge-code-input"
              value={code}
              onChangeText={(t) => {
                setCode(t.toUpperCase());
                setError(null);
              }}
              placeholder="A3B7K2"
              placeholderTextColor="rgba(255,255,255,0.18)"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              style={{
                backgroundColor: 'rgba(255,255,255,0.07)',
                borderRadius: 16,
                borderWidth: 2,
                borderColor: code.trim() ? R.YELLOW : 'rgba(255,255,255,0.1)',
                paddingHorizontal: 24,
                paddingVertical: isTablet ? 26 : 20,
                color: R.YELLOW,
                fontSize: isTablet ? 44 : 36,
                fontFamily: 'Boogaloo_400Regular',
                letterSpacing: 8,
                textAlign: 'center',
              }}
            />

            <Pressable
              testID="paste-from-clipboard"
              onPress={handlePaste}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                alignSelf: 'center',
                paddingHorizontal: 16, paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.07)',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
              }}
            >
              <ClipboardPaste size={14} color="rgba(255,255,255,0.55)" />
              <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '600' }}>
                Paste from clipboard
              </Text>
            </Pressable>

            {error ? (
              <View style={{
                backgroundColor: 'rgba(255,45,107,0.12)',
                borderRadius: 12, padding: 14,
                borderWidth: 1.5, borderColor: 'rgba(255,45,107,0.35)',
              }}>
                <Text style={{ color: R.PINK, fontSize: 13, textAlign: 'center' }}>{error}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: isTablet ? 32 : 0 }}>
          <Pressable
            testID="import-challenge-button"
            onPress={handleImport}
            disabled={loading || !code.trim()}
            style={{ opacity: !code.trim() ? 0.4 : 1 }}
          >
            <View style={{
              ...stickerStyle(R.PINK, 16),
              paddingVertical: isTablet ? 22 : 18,
              alignItems: 'center', justifyContent: 'center',
              flexDirection: 'row', gap: 10,
            }}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Download size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18, fontFamily: 'Boogaloo_400Regular', letterSpacing: 1 }}>
                    LOAD CHALLENGE
                  </Text>
                </>
              )}
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
