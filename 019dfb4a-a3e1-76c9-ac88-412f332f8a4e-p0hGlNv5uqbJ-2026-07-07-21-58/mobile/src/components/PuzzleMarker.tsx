import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  Check,
  Crown,
  Flame,
  Gamepad2,
  Gem,
  Ghost,
  Heart,
  Music,
  Rocket,
  Smile,
  Star,
  Target,
  Zap,
} from 'lucide-react-native';

import { getStickerColor, R, STICKER_COLORS } from '@/lib/retro';

type Props = {
  selected?: boolean;
  found?: boolean;
  size?: number;
  objectId?: string;
};

// 90s arcade sticker icon set using lucide vector icons
const ICON_SET = [
  Star, Zap, Gem, Heart, Flame, Target, Smile,
  Gamepad2, Crown, Ghost, Music, Rocket,
  Star, Zap, Gem, Heart, Flame, Target,
  Smile, Crown, Ghost, Rocket, Gem, Zap, Star,
];

function getIconComponent(id: string) {
  if (!id) return Star;
  const sum = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return ICON_SET[sum % ICON_SET.length];
}

// Expanding ring burst — positioned inside outer container at left:0, top:0
function BurstRing({ size, color }: { size: number; color: string }) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0.9);

  useEffect(() => {
    scale.value = withTiming(3.0, { duration: 500 });
    opacity.value = withSequence(
      withTiming(0.9, { duration: 40 }),
      withTiming(0, { duration: 460 })
    );
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
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 3,
          borderColor: color,
          left: 0,
          top: 0,
        },
        style,
      ]}
    />
  );
}

// Sparkle dot that flies outward
function SparkleParticle({ size, angle, color }: { size: number; angle: number; color: string }) {
  const dist = size * 1.6;
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const opacity = useSharedValue(1);
  const pSize = Math.max(5, size * 0.14);
  const center = size / 2 - pSize / 2;

  useEffect(() => {
    tx.value = withTiming(Math.cos(angle) * dist, { duration: 420 });
    ty.value = withTiming(Math.sin(angle) * dist, { duration: 420 });
    opacity.value = withSequence(
      withTiming(1, { duration: 60 }),
      withTiming(0, { duration: 360 })
    );
  }, [tx, ty, opacity, dist, angle]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: pSize,
          height: pSize,
          borderRadius: pSize / 2,
          backgroundColor: color,
          left: center,
          top: center,
        },
        style,
      ]}
    />
  );
}

const SPARKLE_ANGLES = [
  0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4,
  Math.PI, (5 * Math.PI) / 4, (3 * Math.PI) / 2, (7 * Math.PI) / 4,
];

export function PuzzleMarker({ selected = false, found = false, size = 28, objectId = '' }: Props) {
  const scale = useSharedValue(1);
  const wasFound = useRef(false);

  useEffect(() => {
    if (found && !wasFound.current) {
      wasFound.current = true;
      scale.value = withSequence(
        withSpring(1.7, { damping: 3, stiffness: 420 }),
        withSpring(1, { damping: 10, stiffness: 180 })
      );
    }
  }, [found, scale]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const neonColor = found ? R.GREEN : selected ? R.YELLOW : getStickerColor(objectId);
  const IconComponent = found ? Check : getIconComponent(objectId);
  const iconColor = found ? '#003300' : '#000000';

  // Sticker layers (total footprint = `size` x `size`, same as before)
  const blackBorderW = Math.max(2, size * 0.075);
  const whiteRingW = Math.max(2.5, size * 0.09);
  const innerSize = size - (blackBorderW + whiteRingW) * 2;
  const iconSize = Math.round(innerSize * 0.58);

  return (
    <Animated.View
      entering={FadeIn.springify().damping(8).stiffness(220)}
      exiting={FadeOut.duration(150)}
      style={[
        {
          // Outer black border (die-cut outline shadow)
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#000000',
          borderWidth: blackBorderW,
          borderColor: '#000000',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 1,
          shadowRadius: 0,
          shadowOffset: { width: 3, height: 3 },
          elevation: 7,
        },
        animStyle,
      ]}
    >
      {/* White sticker-paper ring */}
      <View
        style={{
          width: size - blackBorderW * 2,
          height: size - blackBorderW * 2,
          borderRadius: (size - blackBorderW * 2) / 2,
          backgroundColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
          padding: whiteRingW,
        }}
      >
        {/* Neon fill circle with icon */}
        <View
          style={{
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: neonColor,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconComponent size={iconSize} color={iconColor} strokeWidth={2.8} />
        </View>
      </View>

      {/* Burst ring + sparkle particles on found */}
      {found && wasFound.current ? (
        <>
          <BurstRing size={size} color={neonColor} />
          {SPARKLE_ANGLES.map((angle, i) => (
            <SparkleParticle
              key={i}
              size={size}
              angle={angle}
              color={STICKER_COLORS[i % STICKER_COLORS.length]}
            />
          ))}
        </>
      ) : null}
    </Animated.View>
  );
}
