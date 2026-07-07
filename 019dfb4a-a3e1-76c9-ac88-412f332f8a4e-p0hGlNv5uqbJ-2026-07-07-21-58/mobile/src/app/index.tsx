import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Share2, Scissors, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatTime } from '@/lib/challenge';
import { isTablet, MAX_CONTENT_WIDTH } from '@/lib/device';
import { R, stickerStyle, stickerShadow, getStickerIcon, getStickerColor, GRAIN_DOTS, STICKER_COLORS } from '@/lib/retro';
import usePuzzleStore, { type Puzzle } from '@/lib/state/puzzleStore';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const puzzles = usePuzzleStore((s) => s.puzzles);
  const deletePuzzle = usePuzzleStore((s) => s.deletePuzzle);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...puzzles].sort((a, b) => b.createdAt - a.createdAt),
    [puzzles]
  );

  const numColumns = isTablet ? 2 : 1;
  const puzzleRows = isTablet
    ? Array.from({ length: Math.ceil(sorted.length / numColumns) }, (_, rowIdx) =>
        sorted.slice(rowIdx * numColumns, rowIdx * numColumns + numColumns)
      )
    : null;

  return (
    <View testID="home-screen" style={{ flex: 1, backgroundColor: R.BG }}>
      <BackgroundDecor />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Centered content wrapper — constrains width on iPad */}
        <View style={{ width: '100%', maxWidth: isTablet ? MAX_CONTENT_WIDTH : undefined, alignSelf: 'center' }}>

          {/* Header Row */}
          <View style={{ paddingHorizontal: isTablet ? 32 : 20, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Image
                source={require('../assets/app-icon.png')}
                style={{ width: isTablet ? 60 : 50, height: isTablet ? 60 : 50, borderRadius: 14 }}
              />
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '800', letterSpacing: 3, textTransform: 'uppercase' }}>
                  Puzzle Pics
                </Text>
                <Text style={{ color: R.YELLOW, fontSize: 13, fontWeight: '900', letterSpacing: 1.5 }}>
                  Hidden Hunt
                </Text>
              </View>
            </View>
          </View>

          {/* Hero Heading — Permanent Marker brush font, poster layout */}
          <View style={{ paddingHorizontal: isTablet ? 32 : 20, marginBottom: 28 }}>
            <Text style={{ color: R.WHITE, fontSize: isTablet ? 72 : 58, fontFamily: 'PermanentMarker_400Regular', lineHeight: isTablet ? 80 : 66, letterSpacing: -1 }}>
              {'TURN'}
            </Text>
            <Text style={{ color: R.PINK, fontSize: isTablet ? 76 : 62, fontFamily: 'PermanentMarker_400Regular', lineHeight: isTablet ? 84 : 68, letterSpacing: -1, marginTop: -4 }}>
              {'PHOTOS'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12, marginTop: -4 }}>
              <Text style={{ color: R.WHITE, fontSize: isTablet ? 62 : 50, fontFamily: 'PermanentMarker_400Regular', lineHeight: isTablet ? 70 : 58, letterSpacing: -1 }}>
                {'INTO'}
              </Text>
              <Text style={{ color: R.YELLOW, fontSize: isTablet ? 62 : 50, fontFamily: 'PermanentMarker_400Regular', lineHeight: isTablet ? 70 : 58, letterSpacing: -1 }}>
                {'HIDDEN'}
              </Text>
            </View>
            <Text style={{ color: R.TEAL, fontSize: isTablet ? 72 : 58, fontFamily: 'PermanentMarker_400Regular', lineHeight: isTablet ? 78 : 64, letterSpacing: -1, marginTop: -4 }}>
              {'OBJECT'}
            </Text>
            <Text style={{ color: R.GREEN, fontSize: isTablet ? 68 : 54, fontFamily: 'PermanentMarker_400Regular', lineHeight: isTablet ? 74 : 60, letterSpacing: -1, marginTop: -4 }}>
              {'GAMES'}
            </Text>

            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: isTablet ? 16 : 14, marginTop: 12, lineHeight: 22 }}>
              Snap a photo · mark the secrets · challenge anyone!
            </Text>

            {/* Multi-color neon stripe rule */}
            <View style={{ flexDirection: 'row', gap: 3, marginTop: 14 }}>
              {[R.PINK, R.YELLOW, R.TEAL, R.PURPLE, R.GREEN, R.ORANGE].map((c, i) => (
                <View key={i} style={{ height: 4, flex: 1, backgroundColor: c, borderRadius: 2 }} />
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={{ paddingHorizontal: isTablet ? 32 : 20, gap: 12, marginBottom: 36 }}>
            {/* Create New Puzzle — gradient, most vibrant */}
            <Pressable
              testID="create-puzzle-button"
              onPress={() => router.push('/create')}
              className="active:opacity-90"
            >
              <View style={{ borderRadius: 22, borderWidth: 3, borderColor: '#000', ...stickerShadow(6), overflow: 'hidden' }}>
                <LinearGradient
                  colors={['#FF2D95', '#FF6B35']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ padding: isTablet ? 22 : 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}
                >
                  {/* Camera sticker icon */}
                  <View style={{
                    width: isTablet ? 68 : 58, height: isTablet ? 68 : 58,
                    borderRadius: 14,
                    backgroundColor: 'rgba(0,0,0,0.25)',
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 2.5, borderColor: 'rgba(0,0,0,0.5)',
                  }}>
                    <Text style={{ fontSize: isTablet ? 36 : 30 }}>📷</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    {/* Sticker label above */}
                    <View style={{
                      alignSelf: 'flex-start',
                      paddingHorizontal: 8, paddingVertical: 3,
                      backgroundColor: R.YELLOW,
                      borderRadius: 4, borderWidth: 1.5, borderColor: '#000',
                      marginBottom: 5,
                      ...stickerShadow(2),
                    }}>
                      <Text style={{ color: '#000', fontSize: 8, fontWeight: '900', letterSpacing: 2.5 }}>★ START ★</Text>
                    </View>
                    <Text style={{ color: R.WHITE, fontSize: isTablet ? 28 : 24, fontFamily: 'Boogaloo_400Regular', letterSpacing: 0.5 }}>
                      CREATE NEW PUZZLE
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: isTablet ? 14 : 12, marginTop: 3 }}>
                      Pick a photo · tag objects · share!
                    </Text>
                  </View>
                  <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900' }}>→</Text>
                </LinearGradient>
              </View>
            </Pressable>

            {/* Import Challenge — floppy disk card style */}
            <Pressable
              testID="import-challenge-button"
              onPress={() => router.push('/import-challenge')}
              className="active:opacity-90"
            >
              <View style={{
                borderRadius: 18, borderWidth: 2.5, borderColor: '#000',
                backgroundColor: R.PURPLE,
                ...stickerShadow(5),
                padding: isTablet ? 22 : 18, flexDirection: 'row', alignItems: 'center', gap: 14,
              }}>
                {/* Floppy disk sticker */}
                <View style={{
                  width: isTablet ? 68 : 58, height: isTablet ? 68 : 58,
                  borderRadius: 12,
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 2, borderColor: 'rgba(0,0,0,0.5)',
                }}>
                  <Text style={{ fontSize: isTablet ? 36 : 30 }}>💾</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{
                    alignSelf: 'flex-start',
                    paddingHorizontal: 8, paddingVertical: 3,
                    backgroundColor: R.TEAL,
                    borderRadius: 4, borderWidth: 1.5, borderColor: '#000',
                    marginBottom: 5,
                    ...stickerShadow(2),
                  }}>
                    <Text style={{ color: '#000', fontSize: 8, fontWeight: '900', letterSpacing: 2.5 }}>★ LOAD ★</Text>
                  </View>
                  <Text style={{ color: R.WHITE, fontSize: isTablet ? 24 : 20, fontFamily: 'Boogaloo_400Regular', letterSpacing: 0.5 }}>
                    IMPORT CHALLENGE
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: isTablet ? 14 : 12, marginTop: 3 }}>
                    Got a code from a friend?
                  </Text>
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 28 }}>→</Text>
              </View>
            </Pressable>
          </View>

          {/* My Puzzles header */}
          <View style={{ paddingHorizontal: isTablet ? 32 : 20, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 5, height: 28, backgroundColor: R.YELLOW, borderRadius: 3 }} />
              <Text style={{ color: R.WHITE, fontSize: isTablet ? 30 : 26, fontFamily: 'Boogaloo_400Regular', letterSpacing: 1 }}>
                MY PUZZLES
              </Text>
            </View>
            {sorted.length > 0 ? (
              <View style={{
                paddingHorizontal: 12, paddingVertical: 5,
                borderRadius: 8,
                backgroundColor: R.YELLOW,
                borderWidth: 2.5, borderColor: '#000',
                ...stickerShadow(3),
                transform: [{ rotate: '-2deg' }],
              }}>
                <Text style={{ color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 }}>{sorted.length} SAVED</Text>
              </View>
            ) : null}
          </View>

          {sorted.length === 0 ? (
            <EmptyState />
          ) : isTablet && puzzleRows ? (
            /* iPad 2-column grid */
            <View style={{ paddingHorizontal: 24, gap: 14 }}>
              {puzzleRows.map((row, rowIdx) => (
                <View key={rowIdx} style={{ flexDirection: 'row', gap: 14 }}>
                  {row.map((p, colIdx) => {
                    const globalIdx = rowIdx * numColumns + colIdx;
                    return (
                      <View key={p.id} style={{ flex: 1 }}>
                        <PuzzleCard
                          puzzle={p}
                          index={globalIdx}
                          confirming={confirmId === p.id}
                          onConfirmDelete={() => setConfirmId(p.id)}
                          onCancelDelete={() => setConfirmId(null)}
                          onDelete={() => {
                            deletePuzzle(p.id);
                            setConfirmId(null);
                          }}
                        />
                      </View>
                    );
                  })}
                  {/* Fill empty slot in last row */}
                  {row.length < numColumns ? <View style={{ flex: 1 }} /> : null}
                </View>
              ))}
            </View>
          ) : (
            /* iPhone single-column list */
            <View style={{ paddingHorizontal: 20, gap: 14 }}>
              {sorted.map((p, i) => (
                <PuzzleCard
                  key={p.id}
                  puzzle={p}
                  index={i}
                  confirming={confirmId === p.id}
                  onConfirmDelete={() => setConfirmId(p.id)}
                  onCancelDelete={() => setConfirmId(null)}
                  onDelete={() => {
                    deletePuzzle(p.id);
                    setConfirmId(null);
                  }}
                />
              ))}
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}

// Fixed-position confetti/noise dots for background texture (no random — deterministic)
const CONFETTI_DOTS = [
  // top cluster
  { top: 160, left: 25, color: R.PINK, size: 5 },
  { top: 185, left: 50, color: R.YELLOW, size: 4 },
  { top: 172, left: 75, color: R.TEAL, size: 6 },
  { top: 200, left: 100, color: R.GREEN, size: 4 },
  { top: 155, right: 30, color: R.PURPLE, size: 5 },
  { top: 180, right: 55, color: R.ORANGE, size: 4 },
  // mid cluster
  { top: 420, left: 18, color: R.TEAL, size: 5 },
  { top: 445, left: 42, color: R.PINK, size: 6 },
  { top: 433, left: 68, color: R.YELLOW, size: 4 },
  { top: 410, right: 22, color: R.GREEN, size: 5 },
  { top: 455, right: 48, color: R.PURPLE, size: 4 },
  // lower cluster
  { top: 660, left: 30, color: R.YELLOW, size: 5 },
  { top: 685, left: 55, color: R.ORANGE, size: 4 },
  { top: 672, right: 35, color: R.TEAL, size: 6 },
  { top: 700, right: 60, color: R.PINK, size: 4 },
  // scattered singles
  { top: 290, left: 110, color: R.GREEN, size: 4 },
  { top: 540, right: 80, color: R.YELLOW, size: 5 },
  { top: 610, left: 90, color: R.ORANGE, size: 4 },
  { top: 760, right: 90, color: R.TEAL, size: 5 },
  { top: 820, left: 50, color: R.PINK, size: 4 },
] as Array<{ top: number; left?: number; right?: number; color: string; size: number }>;

// Triangle shapes — rendered using border trick
const TRIANGLE_ACCENTS = [
  { top: 250, left: 15, color: R.PINK, size: 10, rotate: '0deg' },
  { top: 370, right: 12, color: R.TEAL, size: 8, rotate: '45deg' },
  { top: 490, left: 105, color: R.YELLOW, size: 9, rotate: '20deg' },
  { top: 620, right: 40, color: R.PURPLE, size: 11, rotate: '-15deg' },
  { top: 730, left: 22, color: R.GREEN, size: 8, rotate: '30deg' },
  { top: 850, right: 15, color: R.ORANGE, size: 10, rotate: '-30deg' },
] as Array<{ top: number; left?: number; right?: number; color: string; size: number; rotate: string }>;

// Zigzag stripe row — small squares rotated 45°
const ZIGZAG_ROWS = [
  { top: 355, count: 18, color: R.YELLOW },
  { top: 590, count: 16, color: R.PINK },
  { top: 790, count: 14, color: R.TEAL },
];

function BackgroundDecor() {
  return (
    <>
      {/* Atmospheric neon glows — slightly stronger than before */}
      <View pointerEvents="none" style={{
        position: 'absolute', top: -130, right: -130,
        width: 380, height: 380, borderRadius: 190,
        backgroundColor: R.TEAL, opacity: 0.07,
      }} />
      <View pointerEvents="none" style={{
        position: 'absolute', bottom: 180, left: -110,
        width: 300, height: 300, borderRadius: 150,
        backgroundColor: R.PINK, opacity: 0.08,
      }} />
      <View pointerEvents="none" style={{
        position: 'absolute', top: 380, right: -90,
        width: 240, height: 240, borderRadius: 120,
        backgroundColor: R.PURPLE, opacity: 0.06,
      }} />
      <View pointerEvents="none" style={{
        position: 'absolute', top: 700, left: -60,
        width: 200, height: 200, borderRadius: 100,
        backgroundColor: R.GREEN, opacity: 0.05,
      }} />

      {/* Grain / noise dots */}
      {GRAIN_DOTS.slice(0, 40).map((dot, i) => (
        <View
          key={`grain-${i}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: `${dot.left}%`,
            top: `${dot.top}%`,
            width: dot.size,
            height: dot.size,
            borderRadius: dot.size / 2,
            backgroundColor: STICKER_COLORS[dot.colorIndex],
            opacity: dot.opacity,
          }}
        />
      ))}

      {/* Confetti dots clusters */}
      {CONFETTI_DOTS.map((dot, i) => (
        <View
          key={`conf-${i}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: dot.top,
            left: dot.left,
            right: dot.right,
            width: dot.size,
            height: dot.size,
            borderRadius: dot.size / 2,
            backgroundColor: dot.color,
            opacity: 0.28,
          }}
        />
      ))}

      {/* Triangle accents */}
      {TRIANGLE_ACCENTS.map((tri, i) => (
        <View
          key={`tri-${i}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: tri.top,
            left: tri.left,
            right: tri.right,
            width: 0, height: 0,
            borderLeftWidth: tri.size,
            borderRightWidth: tri.size,
            borderBottomWidth: tri.size * 1.6,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: tri.color,
            opacity: 0.2,
            transform: [{ rotate: tri.rotate }],
          }}
        />
      ))}

      {/* Zigzag stripe rows — diamonds */}
      {ZIGZAG_ROWS.map((row, ri) => (
        Array.from({ length: row.count }, (_, j) => (
          <View
            key={`zz-${ri}-${j}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: row.top,
              left: 8 + j * 22,
              width: 7, height: 7,
              backgroundColor: row.color,
              opacity: 0.12,
              transform: [{ rotate: '45deg' }],
            }}
          />
        ))
      ))}

      {/* Emoji decorations */}
      {([
        { top: 90, right: 16, emoji: '⭐', size: 30, rotate: '18deg', opacity: 0.22 },
        { top: 180, left: 10, emoji: '⚡', size: 24, rotate: '-12deg', opacity: 0.2 },
        { top: 320, right: 24, emoji: '💎', size: 22, rotate: '8deg', opacity: 0.2 },
        { top: 450, left: 12, emoji: '🎮', size: 26, rotate: '-8deg', opacity: 0.18 },
        { top: 570, right: 18, emoji: '🌟', size: 24, rotate: '15deg', opacity: 0.2 },
        { top: 690, left: 20, emoji: '🔥', size: 22, rotate: '-6deg', opacity: 0.17 },
        { top: 800, right: 30, emoji: '🎯', size: 20, rotate: '10deg', opacity: 0.18 },
        { top: 140, right: 60, emoji: '✦', size: 16, rotate: '0deg', opacity: 0.25 },
        { top: 380, left: 38, emoji: '✦', size: 13, rotate: '0deg', opacity: 0.22 },
        { top: 630, right: 52, emoji: '✦', size: 18, rotate: '0deg', opacity: 0.2 },
        { top: 500, right: 80, emoji: '😎', size: 20, rotate: '-15deg', opacity: 0.15 },
        { top: 280, left: 8, emoji: '🤘', size: 18, rotate: '12deg', opacity: 0.14 },
      ] as Array<{ top: number; right?: number; left?: number; emoji: string; size: number; rotate: string; opacity: number }>).map((item, i) => (
        <View
          key={`emoji-${i}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: item.top, left: item.left, right: item.right,
            transform: [{ rotate: item.rotate }],
            opacity: item.opacity,
          }}
        >
          <Text style={{ fontSize: item.size, color: '#fff' }}>{item.emoji}</Text>
        </View>
      ))}

      {/* Horizontal neon rule lines */}
      <View pointerEvents="none" style={{
        position: 'absolute', top: 340, left: 0, right: 0,
        height: 1.5, opacity: 0.09, backgroundColor: R.YELLOW,
      }} />
      <View pointerEvents="none" style={{
        position: 'absolute', top: 570, left: 0, right: 0,
        height: 1.5, opacity: 0.07, backgroundColor: R.TEAL,
      }} />
    </>
  );
}

function EmptyState() {
  return (
    <Animated.View entering={FadeInDown.springify()}>
      <View style={{
        marginHorizontal: 20,
        padding: 30,
        borderRadius: 20,
        alignItems: 'center',
        backgroundColor: R.CARD,
        borderWidth: 2.5,
        borderColor: 'rgba(255,255,255,0.12)',
        ...stickerShadow(4),
      }}>
        <Text style={{ fontSize: 44 }}>🔍</Text>
        <Text style={{ color: R.WHITE, fontSize: 24, fontFamily: 'Boogaloo_400Regular', marginTop: 10, letterSpacing: 1 }}>
          NO PUZZLES YET
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontSize: 13, marginTop: 8, lineHeight: 20 }}>
          Tap "Create New Puzzle" to make your{'\n'}first hidden object game.
        </Text>
      </View>
    </Animated.View>
  );
}

function PuzzleCard({
  puzzle,
  index,
  confirming,
  onConfirmDelete,
  onCancelDelete,
  onDelete,
}: {
  puzzle: Puzzle;
  index: number;
  confirming: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  const isRemixPuzzle = !!puzzle.isRemix;
  const isChallenge = !!puzzle.challengerName && !isRemixPuzzle;
  const borderColor = isRemixPuzzle ? R.TEAL : isChallenge ? R.PINK : R.YELLOW;
  const tilt = index % 3 === 0 ? '-1.5deg' : index % 3 === 1 ? '1deg' : '-0.5deg';
  const puzzleIcon = getStickerIcon(puzzle.id);
  const puzzleColor = getStickerColor(puzzle.id);

  return (
    <AnimatedPressable
      entering={FadeInDown.delay(index * 60).springify()}
      layout={Layout.springify()}
      testID={`puzzle-card-${puzzle.id}`}
      onPress={() => router.push(`/play/${puzzle.id}`)}
      className="active:opacity-80"
      style={{
        borderRadius: 18,
        backgroundColor: R.CARD,
        borderWidth: 2.5,
        borderColor,
        ...stickerShadow(isChallenge ? 6 : 5),
        flexDirection: 'row',
      }}
    >
      {/* Polaroid thumbnail */}
      <View style={{ position: 'relative' }}>
        {/* Tape accent */}
        <View style={{
          position: 'absolute', top: -7, left: 14, zIndex: 2,
          width: 28, height: 13,
          backgroundColor: 'rgba(255,230,0,0.7)',
          borderRadius: 2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.25)',
          transform: [{ rotate: '-4deg' }],
        }} />
        <View style={{
          margin: 10,
          backgroundColor: '#faf8f0',
          paddingTop: 8, paddingLeft: 8, paddingRight: 8, paddingBottom: 24,
          shadowColor: '#000',
          shadowOffset: { width: 3, height: 5 },
          shadowOpacity: 0.35, shadowRadius: 8, elevation: 8,
          transform: [{ rotate: tilt }],
        }}>
          <Image
            source={{ uri: puzzle.imageUri }}
            style={{ width: 84, height: 84, borderRadius: 2 }}
            contentFit="cover"
          />
          {/* Polaroid caption */}
          <View style={{ position: 'absolute', bottom: 5, left: 8, right: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 8, color: '#888', fontStyle: 'italic', letterSpacing: 0.3 }} numberOfLines={1}>
              find it!
            </Text>
          </View>
        </View>
        {/* Sticker badge */}
        <View style={{
          position: 'absolute', top: 6, right: 4, zIndex: 3,
          width: 24, height: 24, borderRadius: 7,
          backgroundColor: puzzleColor,
          borderWidth: 2.5, borderColor: '#000',
          alignItems: 'center', justifyContent: 'center',
          ...stickerShadow(2),
        }}>
          <Text style={{ fontSize: 12 }}>{puzzleIcon}</Text>
        </View>
      </View>

      <View style={{ flex: 1, padding: 12, justifyContent: 'space-between' }}>
        <View>
          {isChallenge ? (
            <View style={{
              alignSelf: 'flex-start',
              paddingHorizontal: 8, paddingVertical: 3,
              borderRadius: 6, backgroundColor: R.PINK,
              marginBottom: 5, borderWidth: 1.5, borderColor: '#000',
              flexDirection: 'row', alignItems: 'center', gap: 4,
            }}>
              <Share2 size={8} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 }}>CHALLENGE</Text>
            </View>
          ) : isRemixPuzzle ? (
            <View style={{
              alignSelf: 'flex-start',
              paddingHorizontal: 8, paddingVertical: 3,
              borderRadius: 6, backgroundColor: R.TEAL,
              marginBottom: 5, borderWidth: 1.5, borderColor: '#000',
              flexDirection: 'row', alignItems: 'center', gap: 4,
            }}>
              <Scissors size={8} color="#000" />
              <Text style={{ color: '#000', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 }}>REMIX</Text>
            </View>
          ) : null}
          <Text style={{ color: R.WHITE, fontWeight: '800', fontSize: 15, letterSpacing: 0.2 }} numberOfLines={1}>
            {puzzle.title}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 2 }}>
            {puzzle.objects.length} object{puzzle.objects.length === 1 ? '' : 's'} to find
          </Text>
          {isRemixPuzzle && puzzle.remixedBy ? (
            <Text style={{ color: R.TEAL, fontSize: 11, marginTop: 2, fontWeight: '600' }}>
              ✂️ Remixed by {puzzle.remixedBy}
            </Text>
          ) : isChallenge && puzzle.challengerTime !== undefined && puzzle.challengerTime > 0 ? (
            <Text style={{ color: R.ORANGE, fontSize: 11, marginTop: 2, fontWeight: '600' }}>
              Beat {puzzle.challengerName}: {formatTime(puzzle.challengerTime)}
            </Text>
          ) : null}
          {puzzle.bestTime !== undefined ? (
            <Text style={{ color: R.GREEN, fontSize: 11, marginTop: 2, fontWeight: '700' }}>
              ⚡ Best: {formatTime(puzzle.bestTime)}
            </Text>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{
            paddingHorizontal: 12, paddingVertical: 7,
            backgroundColor: R.YELLOW,
            borderRadius: 8,
            borderWidth: 2.5, borderColor: '#000',
            ...stickerShadow(3),
          }}>
            <Text style={{ color: '#000', fontWeight: '900', fontSize: 12, letterSpacing: 1 }}>▶ PLAY</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            {confirming ? (
              <>
                <Pressable
                  testID={`cancel-delete-${puzzle.id}`}
                  onPress={(e) => { e.stopPropagation(); onCancelDelete(); }}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 5,
                    borderRadius: 8,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                  }}
                >
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700' }}>Cancel</Text>
                </Pressable>
                <Pressable
                  testID={`confirm-delete-${puzzle.id}`}
                  onPress={(e) => { e.stopPropagation(); onDelete(); }}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 5,
                    borderRadius: 8,
                    backgroundColor: R.PINK,
                    borderWidth: 1.5, borderColor: '#000',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>Delete</Text>
                </Pressable>
              </>
            ) : (
              <>
                {(isChallenge || isRemixPuzzle) ? (
                  <Pressable
                    testID={`remix-puzzle-${puzzle.id}`}
                    onPress={(e) => { e.stopPropagation(); router.push(`/remix/${puzzle.id}` as never); }}
                    hitSlop={10}
                    style={{ padding: 8 }}
                  >
                    <Scissors size={16} color={R.TEAL} />
                  </Pressable>
                ) : null}
                <Pressable
                  testID={`share-puzzle-${puzzle.id}`}
                  onPress={(e) => { e.stopPropagation(); router.push(`/send-challenge?puzzleId=${puzzle.id}`); }}
                  hitSlop={10}
                  style={{ padding: 8 }}
                >
                  <Share2 size={16} color="rgba(255,255,255,0.4)" />
                </Pressable>
                <Pressable
                  testID={`delete-puzzle-${puzzle.id}`}
                  onPress={(e) => { e.stopPropagation(); onConfirmDelete(); }}
                  hitSlop={10}
                  style={{ padding: 8 }}
                >
                  <Trash2 size={16} color="rgba(255,255,255,0.35)" />
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}
