import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, RotateCcw, Send, Trophy } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PuzzleMarker } from '@/components/PuzzleMarker';
import { ZoomableTapImage } from '@/components/ZoomableTapImage';
import { formatTime } from '@/lib/challenge';
import { isTablet, MAX_PLAY_WIDTH, MAX_MODAL_WIDTH } from '@/lib/device';
import { R, stickerStyle, stickerShadow, getStickerIcon, getStickerColor, STICKER_COLORS } from '@/lib/retro';
import usePuzzleStore, { type PuzzleObject } from '@/lib/state/puzzleStore';

const HIT_THRESHOLD = 0.06;

// Pre-computed confetti pieces (deterministic — no Math.random in render)
const CONFETTI_PIECES = Array.from({ length: 24 }, (_, i) => ({
  key: i,
  color: STICKER_COLORS[i % STICKER_COLORS.length],
  angle: (i / 24) * Math.PI * 2,
  distance: 90 + (i % 4) * 40,
  size: 7 + (i % 3) * 3,
  isRect: i % 3 !== 0,
}));

function ConfettiPiece({ angle, distance, color, size, isRect }: {
  angle: number; distance: number; color: string; size: number; isRect: boolean;
}) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rot = useSharedValue(0);
  const scale = useSharedValue(0.2);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 80 }),
      withTiming(0.9, { duration: 300 }),
      withTiming(0, { duration: 400 })
    );
    scale.value = withSequence(
      withTiming(1.2, { duration: 200 }),
      withTiming(0.8, { duration: 580 })
    );
    tx.value = withTiming(Math.cos(angle) * distance, { duration: 700 });
    ty.value = withTiming(Math.sin(angle) * distance - 30, { duration: 700 });
    rot.value = withTiming(angle > Math.PI ? 360 : -360, { duration: 700 });
  }, [tx, ty, opacity, scale, rot, angle, distance]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${rot.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: isRect ? size * 0.6 : size,
          borderRadius: isRect ? 1 : size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

function ConfettiBurst() {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center', top: '35%', left: '50%' }}>
      {CONFETTI_PIECES.map((p) => (
        <ConfettiPiece key={p.key} angle={p.angle} distance={p.distance} color={p.color} size={p.size} isRect={p.isRect} />
      ))}
    </View>
  );
}

export default function PlayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const puzzle = usePuzzleStore((s) => s.puzzles.find((p) => p.id === id));
  const updatePuzzle = usePuzzleStore((s) => s.updatePuzzle);

  const [foundIds, setFoundIds] = useState<Set<string>>(new Set());
  const [imgLayout, setImgLayout] = useState<{ width: number; height: number } | null>(null);
  const [missAt, setMissAt] = useState<{ x: number; y: number; key: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [completed, setCompleted] = useState(false);
  const startedAt = useRef(Date.now());

  const totalCount = puzzle?.objects.length ?? 0;
  const foundCount = foundIds.size;
  const allFound = totalCount > 0 && foundCount === totalCount;

  useEffect(() => {
    if (!puzzle) return;
    const t = setInterval(() => {
      if (!completed) setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 250);
    return () => clearInterval(t);
  }, [puzzle, completed]);

  useEffect(() => {
    if (allFound && !completed) {
      setCompleted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (puzzle) {
        const finalTime = Math.floor((Date.now() - startedAt.current) / 1000);
        if (!puzzle.bestTime || finalTime < puzzle.bestTime) {
          updatePuzzle(puzzle.id, { bestTime: finalTime });
        }
      }
    }
  }, [allFound, completed, puzzle, updatePuzzle]);

  const reset = () => {
    setFoundIds(new Set());
    setMissAt(null);
    setCompleted(false);
    startedAt.current = Date.now();
    setElapsed(0);
  };

  const handleTap = (tapX: number, tapY: number) => {
    if (!puzzle || !imgLayout || completed) return;
    const remaining = puzzle.objects.filter((o) => !foundIds.has(o.id));

    let bestObj: PuzzleObject | null = null;
    let bestDist = Infinity;
    for (const o of remaining) {
      const d = Math.hypot(o.x - tapX, o.y - tapY);
      if (d < bestDist) {
        bestDist = d;
        bestObj = o;
      }
    }

    if (bestObj && bestDist <= HIT_THRESHOLD) {
      const next = new Set(foundIds);
      next.add(bestObj.id);
      setFoundIds(next);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } else {
      setMissAt({ x: tapX, y: tapY, key: Date.now() });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  if (!puzzle) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: R.BG }}>
        <Text style={{ color: R.WHITE, fontSize: 18, fontFamily: 'Boogaloo_400Regular' }}>Puzzle not found</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: R.PINK }}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const imgAspect = puzzle.imageHeight > 0 ? puzzle.imageWidth / puzzle.imageHeight : 1;

  return (
    <View testID="play-screen" style={{ flex: 1, backgroundColor: R.BG }}>
      {/* Background glows */}
      <View pointerEvents="none" style={{
        position: 'absolute', top: -80, right: -80,
        width: 280, height: 280, borderRadius: 140,
        backgroundColor: R.TEAL, opacity: 0.06,
      }} />
      <View pointerEvents="none" style={{
        position: 'absolute', bottom: 120, left: -60,
        width: 240, height: 240, borderRadius: 120,
        backgroundColor: R.PINK, opacity: 0.06,
      }} />
      <View pointerEvents="none" style={{
        position: 'absolute', top: '50%', left: '50%',
        width: 160, height: 160, borderRadius: 80,
        backgroundColor: R.PURPLE, opacity: 0.04,
        marginLeft: -80, marginTop: -80,
      }} />

      {/* Top bar */}
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        paddingHorizontal: isTablet ? 28 : 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: insets.top + 8, paddingBottom: 8,
      }}>
        <Pressable
          testID="play-back"
          onPress={() => router.back()}
          style={{
            width: isTablet ? 52 : 42, height: isTablet ? 52 : 42, borderRadius: 14,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.75)',
            borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.18)',
            ...stickerShadow(2),
          }}
        >
          <ChevronLeft size={isTablet ? 26 : 22} color={R.WHITE} />
        </Pressable>

        {/* Retro digital timer */}
        <View style={{
          paddingHorizontal: isTablet ? 28 : 20, paddingVertical: isTablet ? 12 : 9,
          borderRadius: 14,
          backgroundColor: '#000',
          borderWidth: 3, borderColor: R.YELLOW,
          flexDirection: 'row', alignItems: 'center', gap: 7,
          ...stickerShadow(4),
        }}>
          <Text style={{ fontSize: isTablet ? 18 : 15 }}>⏱</Text>
          <Text style={{
            color: R.YELLOW,
            fontWeight: '900',
            fontSize: isTablet ? 26 : 20,
            fontFamily: 'Boogaloo_400Regular',
            letterSpacing: 4,
          }}>
            {formatTime(elapsed)}
          </Text>
        </View>

        <Pressable
          testID="play-reset"
          onPress={reset}
          style={{
            width: isTablet ? 52 : 42, height: isTablet ? 52 : 42, borderRadius: 14,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.75)',
            borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.18)',
            ...stickerShadow(2),
          }}
        >
          <RotateCcw size={isTablet ? 22 : 19} color={R.WHITE} />
        </Pressable>
      </View>

      {/* Image in polaroid frame */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: isTablet ? 32 : 12 }}>
        <View style={{
          backgroundColor: '#f8f5e8',
          padding: 10,
          paddingBottom: 40,
          shadowColor: '#000',
          shadowOffset: { width: isTablet ? 8 : 5, height: isTablet ? 12 : 8 },
          shadowOpacity: 0.45,
          shadowRadius: isTablet ? 20 : 14,
          elevation: 14,
          transform: [{ rotate: '-0.8deg' }],
          width: '100%',
          maxWidth: isTablet ? MAX_PLAY_WIDTH : undefined,
          alignSelf: 'center',
        }}>
          {/* Tape top corners */}
          <View style={{
            position: 'absolute', top: -10, left: 22, zIndex: 2,
            width: 36, height: 15,
            backgroundColor: 'rgba(255,230,0,0.7)',
            borderRadius: 2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.18)',
            transform: [{ rotate: '-3deg' }],
          }} />
          <View style={{
            position: 'absolute', top: -10, right: 22, zIndex: 2,
            width: 36, height: 15,
            backgroundColor: 'rgba(0,245,212,0.6)',
            borderRadius: 2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.18)',
            transform: [{ rotate: '4deg' }],
          }} />

          <ZoomableTapImage
            testID="play-image-tap"
            uri={puzzle.imageUri}
            aspectRatio={imgAspect}
            onLayoutSize={setImgLayout}
            onTap={handleTap}
            enableDoubleTap
            panPointers={1}
          >
            {imgLayout
              ? puzzle.objects
                  .filter((o) => foundIds.has(o.id))
                  .map((o) => (
                    <FoundOverlay key={o.id} x={o.x * imgLayout.width} y={o.y * imgLayout.height} objectId={o.id} />
                  ))
              : null}
            {missAt && imgLayout ? (
              <MissPing key={missAt.key} x={missAt.x * imgLayout.width} y={missAt.y * imgLayout.height} />
            ) : null}
          </ZoomableTapImage>

          {/* Polaroid caption — handwritten style */}
          <View style={{ paddingTop: 8, alignItems: 'center' }}>
            <Text style={{ color: '#555', fontSize: 13, fontStyle: 'italic', letterSpacing: 0.3 }} numberOfLines={1}>
              {puzzle.title}
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom HUD */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
        <View style={{
          backgroundColor: 'rgba(11,11,20,0.97)',
          borderTopWidth: 3,
          borderTopColor: R.YELLOW,
          paddingBottom: insets.bottom + (isTablet ? 16 : 12),
          paddingTop: isTablet ? 20 : 16,
        }}>
          {/* Centered inner container for iPad */}
          <View style={{ maxWidth: isTablet ? MAX_PLAY_WIDTH + 60 : undefined, alignSelf: 'center', width: '100%' }}>
            {/* Progress header */}
            <View style={{ paddingHorizontal: isTablet ? 28 : 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: R.WHITE, fontSize: isTablet ? 24 : 20, fontFamily: 'Boogaloo_400Regular', letterSpacing: 0.5, flex: 1 }} numberOfLines={1}>
                {puzzle.title}
              </Text>
              {/* Progress count badge */}
              <View style={{
                paddingHorizontal: 14, paddingVertical: 5,
                borderRadius: 9,
                backgroundColor: foundCount === totalCount ? R.GREEN : R.YELLOW,
                borderWidth: 2.5, borderColor: '#000',
                ...stickerShadow(3),
                marginLeft: 8,
              }}>
                <Text style={{ color: '#000', fontSize: isTablet ? 15 : 13, fontWeight: '900', letterSpacing: 0.5 }}>
                  {foundCount} / {totalCount} FOUND
                </Text>
              </View>
            </View>

            {/* Segmented progress bar — taller, bolder */}
            <View style={{ paddingHorizontal: isTablet ? 28 : 20, flexDirection: 'row', gap: 4, marginBottom: 14 }}>
              {puzzle.objects.map((o) => {
                const isFound = foundIds.has(o.id);
                return (
                  <View
                    key={o.id}
                    style={{
                      flex: 1,
                      height: isTablet ? 18 : 14,
                      borderRadius: 4,
                      backgroundColor: isFound ? getStickerColor(o.id) : 'rgba(255,255,255,0.1)',
                      borderWidth: 1.5,
                      borderColor: isFound ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.07)',
                      ...(isFound ? stickerShadow(1) : {}),
                    }}
                  />
                );
              })}
            </View>

            {/* Object sticker chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: isTablet ? 24 : 16, gap: isTablet ? 10 : 8 }}
              style={{ flexGrow: 0 }}
            >
              {puzzle.objects.map((o) => {
                const found = foundIds.has(o.id);
                const icon = getStickerIcon(o.id);
                return (
                  <View
                    key={o.id}
                    style={{
                      paddingHorizontal: isTablet ? 14 : 11, paddingVertical: isTablet ? 10 : 8,
                      borderRadius: 11,
                      backgroundColor: found ? R.GREEN : 'rgba(255,255,255,0.08)',
                      borderWidth: 2,
                      borderColor: found ? '#003300' : 'rgba(255,255,255,0.14)',
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      ...(found ? stickerShadow(2) : {}),
                    }}
                  >
                    <Text style={{ fontSize: isTablet ? 16 : 14 }}>{icon}</Text>
                    <Text
                      style={{
                        fontSize: isTablet ? 14 : 12, fontWeight: '800',
                        color: found ? '#003300' : R.WHITE,
                        textDecorationLine: found ? 'line-through' : 'none',
                        letterSpacing: 0.3,
                      }}
                    >
                      {o.name}
                    </Text>
                    {found ? <Text style={{ fontSize: isTablet ? 13 : 11 }}>✓</Text> : null}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </View>

      {completed ? (
        <CompletionOverlay elapsed={elapsed} puzzle={puzzle} onReset={reset} />
      ) : null}
    </View>
  );
}

function FoundOverlay({ x, y, objectId }: { x: number; y: number; objectId: string }) {
  return (
    <Animated.View
      entering={FadeIn.springify()}
      style={{ position: 'absolute', left: x - 20, top: y - 20, pointerEvents: 'none' }}
    >
      <PuzzleMarker found size={40} objectId={objectId} />
    </Animated.View>
  );
}

function MissPing({ x, y }: { x: number; y: number }) {
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withTiming(1.8, { duration: 500 });
    opacity.value = withSequence(withTiming(0.9, { duration: 50 }), withTiming(0, { duration: 450 }));
  }, [scale, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: x - 26, top: y - 26,
          width: 52, height: 52,
          borderRadius: 26,
          borderWidth: 3.5,
          borderColor: R.PINK,
        },
        style,
      ]}
    />
  );
}

function CompletionOverlay({
  elapsed,
  puzzle,
  onReset,
}: {
  elapsed: number;
  puzzle: ReturnType<typeof usePuzzleStore.getState>['puzzles'][number];
  onReset: () => void;
}) {
  const trophyScale = useSharedValue(0);
  const isChallenge = !!puzzle.challengerName && puzzle.challengerTime !== undefined && puzzle.challengerTime > 0;
  const challengerTime = puzzle.challengerTime ?? 0;
  const userWon = isChallenge && elapsed < challengerTime;
  const isTie = isChallenge && elapsed === challengerTime;
  const canRemix = !!puzzle.challengerName || !!puzzle.isRemix;

  useEffect(() => {
    trophyScale.value = withRepeat(
      withSequence(withTiming(1.15, { duration: 600 }), withTiming(1, { duration: 600 })),
      -1,
      true
    );
  }, [trophyScale]);
  const trophyStyle = useAnimatedStyle(() => ({ transform: [{ scale: trophyScale.value }] }));

  const handleSendChallenge = () => {
    router.push({
      pathname: '/send-challenge',
      params: { puzzleId: puzzle.id, time: String(elapsed) },
    });
  };

  return (
    <Animated.View
      entering={FadeIn.duration(350)}
      exiting={FadeOut}
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(11,11,20,0.95)',
        alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: isTablet ? 0 : 24,
      }}
    >
      {/* Confetti burst */}
      <ConfettiBurst />

      {/* Scattered neon corner accents */}
      {[R.PINK, R.YELLOW, R.TEAL, R.GREEN, R.PURPLE, R.ORANGE].map((c, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 60 + i * 80,
            left: i % 2 === 0 ? 14 + i * 12 : undefined,
            right: i % 2 === 1 ? 14 + i * 8 : undefined,
            width: 10, height: 10,
            borderRadius: i % 2 === 0 ? 5 : 2,
            backgroundColor: c, opacity: 0.55,
            transform: [{ rotate: `${i * 30}deg` }],
          }}
        />
      ))}

      <Animated.View
        entering={FadeInDown.springify().delay(100)}
        style={{
          alignItems: 'center',
          width: isTablet ? MAX_MODAL_WIDTH : '100%',
          backgroundColor: isTablet ? 'rgba(20,20,35,0.98)' : undefined,
          borderRadius: isTablet ? 28 : 0,
          borderWidth: isTablet ? 2.5 : 0,
          borderColor: isTablet ? 'rgba(255,255,255,0.1)' : 'transparent',
          paddingHorizontal: isTablet ? 40 : 0,
          paddingVertical: isTablet ? 36 : 0,
          ...(isTablet ? { shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.6, shadowRadius: 40, elevation: 20 } : {}),
        }}
      >
        {/* Trophy sticker */}
        <Animated.View style={[
          {
            width: 96, height: 96,
            alignItems: 'center', justifyContent: 'center',
            ...stickerStyle(userWon ? R.GREEN : R.YELLOW, 24),
          },
          trophyStyle,
        ]}>
          <Trophy size={46} color="#000" />
        </Animated.View>

        <Text style={{ color: R.WHITE, fontSize: 36, fontFamily: 'Boogaloo_400Regular', marginTop: 20, letterSpacing: 1 }}>
          PUZZLE COMPLETE!
        </Text>
        <Text style={{ fontSize: 26, marginTop: 6 }}>🎉✨🎊</Text>

        {/* Time badge — retro digital display */}
        <View style={{
          marginTop: 16,
          paddingHorizontal: 28, paddingVertical: 16,
          borderRadius: 14,
          backgroundColor: '#000',
          borderWidth: 3, borderColor: R.TEAL,
          ...stickerShadow(5),
          flexDirection: 'row', alignItems: 'center', gap: 10,
        }}>
          <Text style={{ fontSize: 20 }}>⏱</Text>
          <Text style={{
            color: R.TEAL,
            fontWeight: '900',
            fontSize: 28,
            fontFamily: 'Boogaloo_400Regular',
            letterSpacing: 5,
          }}>
            {formatTime(elapsed)}
          </Text>
        </View>

        {/* Challenge comparison */}
        {isChallenge ? (
          <View style={{
            marginTop: 18, width: '100%',
            padding: 20,
            ...stickerStyle(isTie ? R.YELLOW : userWon ? R.GREEN : R.PINK, 20),
            alignItems: 'center',
          }}>
            <Text style={{ color: isTie || userWon ? '#000' : '#fff', fontSize: 13, marginBottom: 7, fontWeight: '700' }}>
              {puzzle.challengerName}'s time: {formatTime(challengerTime)}
            </Text>
            <Text style={{ color: isTie || userWon ? '#000' : '#fff', fontWeight: '900', fontSize: 26, fontFamily: 'Boogaloo_400Regular' }}>
              {isTie ? "🤝 IT'S A TIE!" : userWon ? '🏆 YOU WIN!' : `Beat ${puzzle.challengerName}!`}
            </Text>
            {!userWon && !isTie ? (
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 5 }}>
                Need {formatTime(elapsed - challengerTime)} faster
              </Text>
            ) : isTie ? (
              <Text style={{ color: 'rgba(0,0,0,0.65)', fontSize: 12, marginTop: 5 }}>Exact same time! 🤯</Text>
            ) : (
              <Text style={{ color: 'rgba(0,0,0,0.65)', fontSize: 12, marginTop: 5 }}>
                {formatTime(challengerTime - elapsed)} faster! 🔥
              </Text>
            )}
          </View>
        ) : null}

        {/* Buttons */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 22, width: '100%' }}>
          <Pressable testID="completion-replay" onPress={onReset} style={{ flex: 1 }}>
            <View style={{
              borderRadius: 16, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.22)',
              backgroundColor: 'rgba(255,255,255,0.1)',
              paddingVertical: 16, alignItems: 'center',
              ...stickerShadow(3),
            }}>
              <Text style={{ color: R.WHITE, fontWeight: '900', fontSize: 16, letterSpacing: 0.5 }}>Play Again</Text>
            </View>
          </Pressable>
          <Pressable testID="completion-send-challenge" onPress={handleSendChallenge} style={{ flex: 1 }}>
            <View style={{
              ...stickerStyle(R.YELLOW, 16),
              paddingVertical: 16,
              alignItems: 'center', justifyContent: 'center',
              flexDirection: 'row', gap: 8,
            }}>
              <Send size={16} color="#000" />
              <Text style={{ color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 }}>Challenge</Text>
            </View>
          </Pressable>
        </View>

        {canRemix ? (
          <Pressable
            testID="completion-remix"
            onPress={() => router.replace(`/remix/${puzzle.id}` as never)}
            style={{ width: '100%', marginTop: 10 }}
          >
            <View style={{
              borderRadius: 16, borderWidth: 2.5, borderColor: R.TEAL,
              backgroundColor: 'rgba(0,245,212,0.1)',
              paddingVertical: 14, alignItems: 'center',
              flexDirection: 'row', justifyContent: 'center', gap: 8,
              ...stickerShadow(3),
            }}>
              <Text style={{ fontSize: 16 }}>✂️</Text>
              <Text style={{ color: R.TEAL, fontWeight: '900', fontSize: 16, letterSpacing: 0.5 }}>Remix Puzzle</Text>
            </View>
          </Pressable>
        ) : null}

        <Pressable testID="completion-home" onPress={() => router.back()} style={{ marginTop: 14 }}>
          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>← Back to puzzles</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}
