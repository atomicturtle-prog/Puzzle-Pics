import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Send, Share2, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatTime, uploadChallenge } from '@/lib/challenge';
import { buildShareMessage } from '@/lib/links';
import { isTablet, MAX_MODAL_WIDTH } from '@/lib/device';
import { R, stickerStyle } from '@/lib/retro';
import usePuzzleStore from '@/lib/state/puzzleStore';

export default function SendChallengeScreen() {
  const { puzzleId, time } = useLocalSearchParams<{ puzzleId: string; time: string }>();
  const puzzle = usePuzzleStore((s) => s.puzzles.find((p) => p.id === puzzleId));
  const insets = useSafeAreaInsets();

  const elapsed = parseInt(time ?? '0', 10);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shortCode, setShortCode] = useState<string | null>(null);
  const nameRef = useRef<TextInput>(null);

  const handleGenerate = async () => {
    if (!puzzle || !name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const code = await uploadChallenge(
        puzzle,
        name.trim(),
        elapsed,
        message.trim() || undefined
      );
      setShortCode(code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      setError('Could not create the challenge. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!shortCode) return;
    let shareText = buildShareMessage({ code: shortCode, senderName: name.trim() });
    // Tack on the optional challenge flourishes (time to beat / personal note).
    const extras: string[] = [];
    if (elapsed > 0) extras.push(`⏱️ Can you beat my time of ${formatTime(elapsed)}?`);
    if (message.trim()) extras.push(`"${message.trim()}"`);
    if (extras.length) shareText = `${shareText}\n\n${extras.join('\n')}`;
    try {
      await Share.share({ message: shareText });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch {
      // user dismissed share sheet — that's fine
    }
  };

  // ── Code Ready State ──────────────────────────────────────────────────────
  if (shortCode) {
    return (
      <View
        testID="send-challenge-ready-screen"
        style={{ flex: 1, backgroundColor: '#111', paddingBottom: insets.bottom + 16, alignItems: isTablet ? 'center' : undefined, justifyContent: isTablet ? 'center' : undefined }}
      >
        <View style={{ width: '100%', maxWidth: isTablet ? MAX_MODAL_WIDTH : undefined }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20,
          }}>
            <Text style={{ color: R.WHITE, fontSize: 22, fontFamily: 'Boogaloo_400Regular', letterSpacing: 0.5 }}>
              CHALLENGE READY!
            </Text>
            <Pressable
              testID="send-challenge-close"
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

          <View style={{ alignItems: 'center', paddingHorizontal: 32, gap: 24, paddingVertical: isTablet ? 32 : 0, flex: isTablet ? undefined : 1, justifyContent: isTablet ? undefined : 'center' }}>
            {/* Big code display */}
            <View style={{ alignItems: 'center', gap: 12 }}>
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '700', letterSpacing: 3, textTransform: 'uppercase' }}>
                Challenge Code
              </Text>
              <View style={{ ...stickerStyle(R.YELLOW, 20), paddingHorizontal: 32, paddingVertical: 16 }}>
                <Text
                  testID="challenge-short-code"
                  selectable
                  style={{ color: '#000', fontSize: isTablet ? 50 : 42, fontFamily: 'Boogaloo_400Regular', letterSpacing: 6 }}
                >
                  {shortCode}
                </Text>
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center' }}>
                Your friend types this code in{'\n'}Puzzle Pic to play your challenge
              </Text>
            </View>

            {/* Time badge */}
            {elapsed > 0 ? (
              <View style={{ ...stickerStyle(R.GREEN, 12), paddingHorizontal: 18, paddingVertical: 8 }}>
                <Text style={{ color: '#000', fontWeight: '900', fontSize: 16 }}>
                  ⏱ Beat my time: {formatTime(elapsed)}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={{ paddingHorizontal: 20, gap: 12, marginTop: isTablet ? 24 : 0 }}>
            {/* Share button — short message, works in all apps */}
            <Pressable testID="share-challenge-button" onPress={handleShare}>
              <View style={{
                ...stickerStyle(R.PINK, 16),
                paddingVertical: isTablet ? 22 : 18,
                alignItems: 'center', justifyContent: 'center',
                flexDirection: 'row', gap: 10,
              }}>
                <Share2 size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18, fontFamily: 'Boogaloo_400Regular', letterSpacing: 1 }}>
                  SEND TO A FRIEND
                </Text>
              </View>
            </Pressable>

            <Pressable testID="send-challenge-done-button" onPress={() => router.back()}>
              <View style={{
                paddingVertical: 14,
                alignItems: 'center',
                borderRadius: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)',
              }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontWeight: '700', fontSize: 15 }}>
                  Done
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // ── Form State ────────────────────────────────────────────────────────────
  return (
    <View
      testID="send-challenge-screen"
      style={{ flex: 1, backgroundColor: '#111', paddingBottom: insets.bottom + 16, alignItems: isTablet ? 'center' : undefined, justifyContent: isTablet ? 'center' : undefined }}
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
              ...stickerStyle(R.YELLOW, 10),
            }}>
              <Share2 size={18} color="#000" />
            </View>
            <Text style={{ color: R.WHITE, fontSize: 22, fontFamily: 'Boogaloo_400Regular', letterSpacing: 0.5 }}>
              SEND CHALLENGE
            </Text>
          </View>
          <Pressable
            testID="send-challenge-close"
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

        {/* Time badge */}
        {elapsed > 0 ? (
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View style={{ paddingHorizontal: 20, paddingVertical: 10, ...stickerStyle(R.GREEN, 14) }}>
              <Text style={{ color: '#000', fontWeight: '900', fontSize: 20 }}>
                ⏱ {formatTime(elapsed)}
              </Text>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 8 }}>
              Can your friend beat it?
            </Text>
          </View>
        ) : (
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
              Challenge a friend to find the hidden objects!
            </Text>
          </View>
        )}

        {/* Inputs */}
        <View style={{ paddingHorizontal: 20, gap: 16 }}>
          <View>
            <Text style={{ color: R.YELLOW, fontSize: 10, fontWeight: '900', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 8 }}>
              Your Name *
            </Text>
            <TextInput
              ref={nameRef}
              testID="challenger-name-input"
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="rgba(255,255,255,0.2)"
              returnKeyType="next"
              style={{
                backgroundColor: R.CARD,
                borderRadius: 12, borderWidth: 2,
                borderColor: name.trim() ? R.YELLOW : 'rgba(255,255,255,0.1)',
                paddingHorizontal: 16, paddingVertical: isTablet ? 18 : 14,
                color: R.WHITE, fontSize: isTablet ? 18 : 16, fontWeight: '700',
              }}
            />
          </View>

          <View>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 8 }}>
              Message (Optional)
            </Text>
            <TextInput
              testID="challenge-message-input"
              value={message}
              onChangeText={setMessage}
              placeholder="Can you beat my time? 😏"
              placeholderTextColor="rgba(255,255,255,0.2)"
              returnKeyType="done"
              multiline
              style={{
                backgroundColor: R.CARD,
                borderRadius: 12, borderWidth: 2,
                borderColor: 'rgba(255,255,255,0.1)',
                paddingHorizontal: 16, paddingVertical: 14,
                color: R.WHITE, fontSize: 15,
                minHeight: isTablet ? 100 : 80, textAlignVertical: 'top',
              }}
            />
          </View>

          {error ? (
            <View style={{
              backgroundColor: 'rgba(255,45,107,0.12)',
              borderRadius: 10, padding: 12,
              borderWidth: 1.5, borderColor: 'rgba(255,45,107,0.35)',
            }}>
              <Text style={{ color: R.PINK, fontSize: 13 }}>{error}</Text>
            </View>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: isTablet ? 32 : 16 }}>
          <Pressable
            testID="generate-challenge-button"
            onPress={handleGenerate}
            disabled={loading || !name.trim()}
            style={{ opacity: !name.trim() ? 0.4 : 1 }}
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
                  <Send size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18, fontFamily: 'Boogaloo_400Regular', letterSpacing: 1 }}>
                    CREATE CHALLENGE
                  </Text>
                </>
              )}
            </View>
          </Pressable>
          <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
            Generates a short code your friend can enter
          </Text>
        </View>
      </View>
    </View>
  );
}
