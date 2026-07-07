import { Image } from 'expo-image';
import React, { ReactNode, useState } from 'react';
import {
  LayoutChangeEvent,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export type ImageSize = { width: number; height: number };

type Props = {
  uri: string;
  aspectRatio: number;
  /** Tap callback with image-relative coordinates (0..1), correct at any zoom. */
  onTap?: (xRel: number, yRel: number) => void;
  /** Reports the laid-out pixel size of the image area (the un-zoomed base). */
  onLayoutSize?: (size: ImageSize) => void;
  /** Overlays (markers, etc.) positioned in base coordinates — they zoom/pan with the image. */
  children?: ReactNode;
  /**
   * Optional shared value to mirror the current zoom scale. Pass this in when an
   * overlay (e.g. a draggable marker) needs to convert screen movement into base
   * coordinates while zoomed.
   */
  scale?: SharedValue<number>;
  /** Minimum fingers required to pan. 1 = drag with one finger; 2 = two-finger pan. */
  panPointers?: 1 | 2;
  maxScale?: number;
  enableDoubleTap?: boolean;
  contentFit?: 'cover' | 'contain';
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function ZoomableTapImage({
  uri,
  aspectRatio,
  onTap,
  onLayoutSize,
  children,
  scale: externalScale,
  panPointers = 1,
  maxScale = 4,
  enableDoubleTap = true,
  contentFit = 'cover',
  style,
  testID,
}: Props) {
  const internalScale = useSharedValue(1);
  const scale = externalScale ?? internalScale;
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const w = useSharedValue(0);
  const h = useSharedValue(0);

  const [size, setSize] = useState<ImageSize | null>(null);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      w.value = width;
      h.value = height;
      setSize({ width, height });
      onLayoutSize?.({ width, height });
    }
  };

  // ── Pinch to zoom ──────────────────────────────────────────────────────────
  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      const next = Math.min(maxScale, Math.max(1, savedScale.value * e.scale));
      scale.value = next;
      const maxX = ((next - 1) * w.value) / 2;
      const maxY = ((next - 1) * h.value) / 2;
      tx.value = Math.min(maxX, Math.max(-maxX, tx.value));
      ty.value = Math.min(maxY, Math.max(-maxY, ty.value));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1.001) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        savedTx.value = 0;
        savedTy.value = 0;
      } else {
        savedTx.value = tx.value;
        savedTy.value = ty.value;
      }
    });

  // ── Pan when zoomed ────────────────────────────────────────────────────────
  const pan = Gesture.Pan()
    .minPointers(panPointers)
    .maxPointers(2)
    .averageTouches(true)
    .onUpdate((e) => {
      if (scale.value <= 1) return;
      const maxX = ((scale.value - 1) * w.value) / 2;
      const maxY = ((scale.value - 1) * h.value) / 2;
      tx.value = Math.min(maxX, Math.max(-maxX, savedTx.value + e.translationX));
      ty.value = Math.min(maxY, Math.max(-maxY, savedTy.value + e.translationY));
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  // ── Single tap → relative coordinates (pre-transform local space) ──────────
  const singleTap = Gesture.Tap()
    .maxDuration(250)
    .onEnd((e) => {
      if (!onTap) return;
      const xRel = w.value > 0 ? e.x / w.value : 0;
      const yRel = h.value > 0 ? e.y / h.value : 0;
      if (xRel < 0 || xRel > 1 || yRel < 0 || yRel > 1) return;
      onTap(xRel, yRel);
    })
    .runOnJS(true);

  // ── Double tap → toggle zoom toward the tapped point ───────────────────────
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(300)
    .onEnd((e) => {
      if (scale.value > 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        savedTx.value = 0;
        savedTy.value = 0;
      } else {
        const target = 2.5;
        const ntx = (w.value / 2 - e.x) * (target - 1);
        const nty = (h.value / 2 - e.y) * (target - 1);
        scale.value = withTiming(target);
        savedScale.value = target;
        tx.value = withTiming(ntx);
        ty.value = withTiming(nty);
        savedTx.value = ntx;
        savedTy.value = nty;
      }
    });

  const tapGesture = enableDoubleTap
    ? Gesture.Exclusive(doubleTap, singleTap)
    : singleTap;
  const composed = Gesture.Simultaneous(pinch, pan, tapGesture);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View
      testID={testID}
      style={[{ width: '100%', aspectRatio, overflow: 'hidden' }, style]}
      onLayout={handleLayout}
    >
      <GestureDetector gesture={composed}>
        <Animated.View style={[{ width: '100%', height: '100%' }, animStyle]}>
          <Image
            source={{ uri }}
            style={{ width: '100%', height: '100%' }}
            contentFit={contentFit}
          />
          {size ? children : null}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
