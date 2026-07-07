import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Send, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, SlideInDown, SlideOutDown, useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { encodeChallengePayload } from '@/lib/challenge';
import { buildShareMessage } from '@/lib/links';
import { R, stickerStyle, stickerShadow } from '@/lib/retro';
import usePuzzleStore, { type PuzzleObject } from '@/lib/state/puzzleStore';

const MAX_NEW = 5;

export default function RemixScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const puzzle = usePuzzleStore((s) => s.puzzles.find((p) => p.id === id));

  const [newObjects, setNewObjects] = useState<PuzzleObject[]>([]);
  const [namingId, setNamingId] = useState<string | null>(null);
  const [imgLayout, setImgLayout] = useState<{ width: number; height: number } | null>(null);

  const [showSend, setShowSend] = useState(false);
  const [remixerName, setRemixerName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!puzzle) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: R.BG }}>
        <Text style={{ color: R.WHITE, fontSize: 18, fontFamily: 'Boogaloo_400Regular' }}>Puzzle not found</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16, padding: 12 }}>
          <Text style={{ color: R.PINK, fontWeight: '700' }}>← Back</Text>
        </Pressable>
      </View>
    );
  }

  const imgAspect = puzzle.imageHeight > 0 ? puzzle.imageWidth / puzzle.imageHeight : 1;
  const namedNewObjects = newObjects.filter((o) => o.name.trim());
  const canSend = namedNewObjects.length > 0;

  const handleTap = (e: { nativeEvent: { locationX: number; locationY: number } }) => {
    if (namingId || !imgLayout || showSend) return;
    if (newObjects.length >= MAX_NEW) return;

    const tapX = e.nativeEvent.locationX / imgLayout.width;
    const tapY = e.nativeEvent.locationY / imgLayout.height;

    const newObj: PuzzleObject = {
      id: `remix_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: '',
      x: tapX,
      y: tapY,
    };

    setNewObjects((prev) => [...prev, newObj]);
    setNamingId(newObj.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const handleNameDone = (name: string) => {
    if (!namingId) return;
    if (!name.trim()) {
      setNewObjects((prev) => prev.filter((o) => o.id !== namingId));
    } else {
      setNewObjects((prev) =>
        prev.map((o) => (o.id === namingId ? { ...o, name: name.trim() } : o))
      );
    }
    setNamingId(null);
  };

  const removeObject = (objId: string) => {
    setNewObjects((prev) => prev.filter((o) => o.id !== objId));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const handleSendRemix = async () => {
    if (!puzzle || !remixerName.trim() || namedNewObjects.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const mergedPuzzle = {
        ...puzzle,
        objects: [...puzzle.objects, ...namedNewObjects],
      };

      const encoded = await encodeChallengePayload(
        mergedPuzzle,
        remixerName.trim(),
        0,
        message.trim() || undefined,
        { isRemix: true, remixedBy: remixerName.trim() }
      );

      let shareText = buildShareMessage({
        code: encoded,
        senderName: remixerName.trim(),
        isRemix: true,
      });
      const extras: string[] = [
        `🆕 Added ${namedNewObjects.length} new hidden object${namedNewObjects.length === 1 ? '' : 's'}!`,
      ];
      if (message.trim()) extras.push(`"${message.trim()}"`);
      shareText = `${shareText}\n\n${extras.join('\n')}`;

      await Share.share({ message: shareText });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch {
      setError('Could not encode the remix. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View testID="remix-screen" style={{ flex: 1, backgroundColor: R.BG }}>
      {/* Background glows */}
      <View pointerEvents="none" style={{
        position: 'absolute', top: -80, right: -80,
        width: 280, height: 280, borderRadius: 140,
        backgroundColor: R.TEAL, opacity: 0.07,
      }} />
      <View pointerEvents="none" style={{
        position: 'absolute', bottom: 120, left: -60,
        width: 240, height: 240, borderRadius: 120,
        backgroundColor: R.PURPLE, opacity: 0.06,
      }} />

      {/* Top bar */}
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: insets.top + 8, paddingBottom: 8,
      }}>
        <Pressable
          testID="remix-back"
          onPress={() => router.back()}
          style={{
            width: 42, height: 42, borderRadius: 12,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.75)',
            borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.18)',
            ...stickerShadow(2),
          }}
        >
          <ChevronLeft size={22} color={R.WHITE} />
        </Pressable>

        <View style={{
          paddingHorizontal: 18, paddingVertical: 9,
          borderRadius: 12,
          backgroundColor: '#000',
          borderWidth: 3, borderColor: R.TEAL,
          flexDirection: 'row', alignItems: 'center', gap: 7,
          ...stickerShadow(4),
        }}>
          <Text style={{ fontSize: 15 }}>✂️</Text>
          <Text style={{
            color: R.TEAL,
            fontWeight: '900', fontSize: 17,
            fontFamily: 'Boogaloo_400Regular', letterSpacing: 2,
          }}>
            REMIX
          </Text>
        </View>

        <View style={{
          width: 42, height: 42, borderRadius: 12,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: newObjects.length > 0 ? R.PINK : 'rgba(255,255,255,0.07)',
          borderWidth: 2.5, borderColor: newObjects.length > 0 ? '#000' : 'rgba(255,255,255,0.15)',
          ...stickerShadow(2),
        }}>
          <Text style={{
            color: newObjects.length > 0 ? '#fff' : 'rgba(255,255,255,0.35)',
            fontSize: 14, fontWeight: '900',
          }}>
            +{newObjects.length}
          </Text>
        </View>
      </View>

      {/* Instruction banner */}
      <View style={{
        position: 'absolute', top: insets.top + 64, left: 0, right: 0, zIndex: 9,
        alignItems: 'center', paddingHorizontal: 20,
      }}>
        <View style={{
          paddingHorizontal: 14, paddingVertical: 6,
          borderRadius: 20,
          backgroundColor: 'rgba(0,0,0,0.8)',
          borderWidth: 1.5,
          borderColor: newObjects.length >= MAX_NEW ? R.ORANGE : R.TEAL,
        }}>
          <Text style={{
            color: newObjects.length >= MAX_NEW ? R.ORANGE : R.TEAL,
            fontSize: 12, fontWeight: '700',
          }}>
            {newObjects.length >= MAX_NEW
              ? `Max ${MAX_NEW} objects — name them to continue`
              : `Tap image to add hidden objects (${newObjects.length}/${MAX_NEW})`}
          </Text>
        </View>
      </View>

      {/* Image */}
      <View style={{
        flex: 1, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 12,
        paddingTop: insets.top + 104,
        paddingBottom: 160,
      }}>
        <View style={{
          backgroundColor: '#f8f5e8',
          padding: 10, paddingBottom: 36,
          shadowColor: '#000',
          shadowOffset: { width: 5, height: 8 },
          shadowOpacity: 0.45, shadowRadius: 14, elevation: 14,
          transform: [{ rotate: '-0.8deg' }],
          width: '100%',
        }}>
          {/* Teal tape corners for remix style */}
          <View style={{
            position: 'absolute', top: -10, left: 22, zIndex: 2,
            width: 36, height: 15,
            backgroundColor: 'rgba(0,245,212,0.75)',
            borderRadius: 2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.18)',
            transform: [{ rotate: '-3deg' }],
          }} />
          <View style={{
            position: 'absolute', top: -10, right: 22, zIndex: 2,
            width: 36, height: 15,
            backgroundColor: 'rgba(0,245,212,0.75)',
            borderRadius: 2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.18)',
            transform: [{ rotate: '4deg' }],
          }} />

          <View
            style={{ width: '100%', aspectRatio: imgAspect }}
            onLayout={(e) =>
              setImgLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
            }
          >
            <Pressable onPress={handleTap} style={{ width: '100%', height: '100%' }} testID="remix-image-tap">
              <Image
                source={{ uri: puzzle.imageUri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />

              {/* Existing objects — ghost markers */}
              {imgLayout
                ? puzzle.objects.map((o) => (
                    <View
                      key={o.id}
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        left: o.x * imgLayout.width - 11,
                        top: o.y * imgLayout.height - 11,
                        width: 22, height: 22, borderRadius: 6,
                        backgroundColor: 'rgba(255,255,255,0.15)',
                        borderWidth: 2, borderColor: 'rgba(255,255,255,0.45)',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.55)' }} />
                    </View>
                  ))
                : null}

              {/* New objects — bright markers */}
              {imgLayout
                ? newObjects.map((o) => (
                    <Pressable
                      key={o.id}
                      onPress={(e) => { e.stopPropagation(); setNamingId(o.id); }}
                      style={{
                        position: 'absolute',
                        left: o.x * imgLayout.width - 18,
                        top: o.y * imgLayout.height - 18,
                        width: 36, height: 36,
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <View style={{
                        width: 34, height: 34, borderRadius: 10,
                        backgroundColor: o.name ? R.PINK : R.ORANGE,
                        borderWidth: 3, borderColor: '#000',
                        alignItems: 'center', justifyContent: 'center',
                        ...stickerShadow(3),
                      }}>
                        <Text style={{ fontSize: 14 }}>{o.name ? '✓' : '?'}</Text>
                      </View>
                    </Pressable>
                  ))
                : null}
            </Pressable>
          </View>

          <View style={{ paddingTop: 6, alignItems: 'center' }}>
            <Text style={{ color: '#555', fontSize: 12, fontStyle: 'italic' }} numberOfLines={1}>
              {puzzle.title}
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom HUD */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <View style={{
          backgroundColor: 'rgba(11,11,20,0.97)',
          borderTopWidth: 3, borderTopColor: R.TEAL,
          paddingBottom: insets.bottom + 12, paddingTop: 14,
        }}>
          {newObjects.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8, marginBottom: 12 }}
              style={{ flexGrow: 0 }}
            >
              {newObjects.map((o) => (
                <View
                  key={o.id}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 11,
                    backgroundColor: o.name ? R.PINK : 'rgba(255,107,53,0.25)',
                    borderWidth: 2,
                    borderColor: o.name ? '#000' : R.ORANGE,
                    ...stickerShadow(2),
                  }}
                >
                  <Pressable onPress={() => setNamingId(o.id)}>
                    <Text style={{
                      fontSize: 12, fontWeight: '800',
                      color: o.name ? '#fff' : R.ORANGE,
                    }}>
                      {o.name || 'Tap to name'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => removeObject(o.id)} hitSlop={8}>
                    <X size={12} color={o.name ? 'rgba(255,255,255,0.7)' : R.ORANGE} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={{
              color: 'rgba(255,255,255,0.3)', fontSize: 13,
              textAlign: 'center', marginBottom: 12,
            }}>
              No objects yet — tap the image to add!
            </Text>
          )}

          <View style={{ paddingHorizontal: 16 }}>
            <Pressable
              testID="send-remix-button"
              onPress={() => setShowSend(true)}
              disabled={!canSend}
              style={{ opacity: canSend ? 1 : 0.35 }}
            >
              <View style={{
                ...stickerStyle(R.TEAL, 16),
                paddingVertical: 16,
                alignItems: 'center', justifyContent: 'center',
                flexDirection: 'row', gap: 10,
              }}>
                <Send size={18} color="#000" />
                <Text style={{
                  color: '#000', fontWeight: '900', fontSize: 18,
                  fontFamily: 'Boogaloo_400Regular', letterSpacing: 1,
                }}>
                  SEND REMIX
                </Text>
              </View>
            </Pressable>
            {!canSend && newObjects.length > 0 ? (
              <Text style={{ color: R.ORANGE, fontSize: 11, textAlign: 'center', marginTop: 6 }}>
                Tap your markers to name them first
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Naming sheet */}
      {namingId !== null ? (
        <NameSheet
          existingName={newObjects.find((o) => o.id === namingId)?.name ?? ''}
          onDone={handleNameDone}
          onCancel={() => {
            const obj = newObjects.find((o) => o.id === namingId);
            if (obj && !obj.name) {
              setNewObjects((prev) => prev.filter((o) => o.id !== namingId));
            }
            setNamingId(null);
          }}
          insets={insets}
        />
      ) : null}

      {/* Send remix overlay */}
      {showSend ? (
        <SendRemixOverlay
          namedCount={namedNewObjects.length}
          name={remixerName}
          setName={setRemixerName}
          message={message}
          setMessage={setMessage}
          loading={loading}
          error={error}
          onSend={handleSendRemix}
          onClose={() => { setShowSend(false); setError(null); }}
          insets={insets}
        />
      ) : null}
    </View>
  );
}

function NameSheet({
  existingName,
  onDone,
  onCancel,
  insets,
}: {
  existingName: string;
  onDone: (name: string) => void;
  onCancel: () => void;
  insets: ReturnType<typeof import('react-native-safe-area-context').useSafeAreaInsets>;
}) {
  const [value, setValue] = useState(existingName);
  const inputRef = useRef<TextInput>(null);

  const keyboard = useAnimatedKeyboard();
  const sheetStyle = useAnimatedStyle(() => ({
    paddingBottom: keyboard.height.value > 0
      ? keyboard.height.value + 16
      : insets.bottom + 16,
  }));

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(18)}
      exiting={SlideOutDown.springify()}
      style={[{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 50,
        backgroundColor: R.CARD,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        borderTopWidth: 3, borderColor: R.PINK,
        paddingHorizontal: 20, paddingTop: 20,
        ...stickerShadow(6),
      }, sheetStyle]}
    >
      <Text style={{
        color: R.YELLOW, fontSize: 10, fontWeight: '900',
        letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 10,
      }}>
        Name this hidden object
      </Text>
      <TextInput
        ref={inputRef}
        testID="remix-object-name-input"
        value={value}
        onChangeText={setValue}
        placeholder="e.g. red coffee mug"
        placeholderTextColor="rgba(255,255,255,0.2)"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => { Keyboard.dismiss(); onDone(value); }}
        style={{
          backgroundColor: '#0B0B14',
          borderRadius: 12, borderWidth: 2,
          borderColor: value.trim() ? R.PINK : 'rgba(255,255,255,0.12)',
          paddingHorizontal: 16, paddingVertical: 14,
          color: R.WHITE, fontSize: 16, fontWeight: '700',
          marginBottom: 14,
        }}
      />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          onPress={onCancel}
          style={{
            flex: 1, paddingVertical: 14, borderRadius: 12,
            borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)',
            backgroundColor: 'rgba(255,255,255,0.05)',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontWeight: '800' }}>Cancel</Text>
        </Pressable>
        <Pressable
          testID="remix-name-done"
          onPress={() => { Keyboard.dismiss(); onDone(value); }}
          disabled={!value.trim()}
          style={{
            flex: 2, paddingVertical: 14,
            ...stickerStyle(R.PINK, 12),
            alignItems: 'center',
            opacity: value.trim() ? 1 : 0.4,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>
            {value.trim() ? `Add "${value.trim()}"` : 'Enter a name'}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function SendRemixOverlay({
  namedCount,
  name,
  setName,
  message,
  setMessage,
  loading,
  error,
  onSend,
  onClose,
  insets,
}: {
  namedCount: number;
  name: string;
  setName: (v: string) => void;
  message: string;
  setMessage: (v: string) => void;
  loading: boolean;
  error: string | null;
  onSend: () => void;
  onClose: () => void;
  insets: ReturnType<typeof import('react-native-safe-area-context').useSafeAreaInsets>;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(11,11,20,0.92)',
        zIndex: 60,
        justifyContent: 'flex-end',
      }}
    >
      <Animated.View
        entering={SlideInDown.springify().damping(18)}
        exiting={SlideOutDown}
        style={{
          backgroundColor: R.CARD,
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          borderTopWidth: 3, borderColor: R.TEAL,
          paddingHorizontal: 20, paddingTop: 24,
          paddingBottom: insets.bottom + 16,
          ...stickerShadow(8),
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ ...stickerStyle(R.TEAL, 10), width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 18 }}>✂️</Text>
            </View>
            <View>
              <Text style={{ color: R.WHITE, fontSize: 22, fontFamily: 'Boogaloo_400Regular', letterSpacing: 0.5 }}>
                SEND REMIX
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
                +{namedCount} new object{namedCount === 1 ? '' : 's'} added
              </Text>
            </View>
          </View>
          <Pressable
            onPress={onClose}
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

        {/* Name input */}
        <View style={{ marginBottom: 14 }}>
          <Text style={{
            color: R.TEAL, fontSize: 10, fontWeight: '900',
            letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 8,
          }}>
            Your Name *
          </Text>
          <TextInput
            testID="remix-sender-name-input"
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor="rgba(255,255,255,0.2)"
            autoFocus
            returnKeyType="next"
            style={{
              backgroundColor: '#0B0B14',
              borderRadius: 12, borderWidth: 2,
              borderColor: name.trim() ? R.TEAL : 'rgba(255,255,255,0.1)',
              paddingHorizontal: 16, paddingVertical: 14,
              color: R.WHITE, fontSize: 16, fontWeight: '700',
            }}
          />
        </View>

        {/* Message input */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{
            color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900',
            letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 8,
          }}>
            Message (Optional)
          </Text>
          <TextInput
            testID="remix-message-input"
            value={message}
            onChangeText={setMessage}
            placeholder="I added some sneaky ones! 😏"
            placeholderTextColor="rgba(255,255,255,0.2)"
            returnKeyType="done"
            multiline
            style={{
              backgroundColor: '#0B0B14',
              borderRadius: 12, borderWidth: 2,
              borderColor: 'rgba(255,255,255,0.1)',
              paddingHorizontal: 16, paddingVertical: 14,
              color: R.WHITE, fontSize: 15,
              minHeight: 72, textAlignVertical: 'top',
            }}
          />
        </View>

        {error ? (
          <View style={{
            backgroundColor: 'rgba(255,45,107,0.12)',
            borderRadius: 10, padding: 12, marginBottom: 14,
            borderWidth: 1.5, borderColor: 'rgba(255,45,107,0.35)',
          }}>
            <Text style={{ color: R.PINK, fontSize: 13 }}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          testID="confirm-send-remix"
          onPress={onSend}
          disabled={loading || !name.trim()}
          style={{ opacity: !name.trim() ? 0.4 : 1 }}
        >
          <View style={{
            ...stickerStyle(R.TEAL, 16),
            paddingVertical: 18,
            alignItems: 'center', justifyContent: 'center',
            flexDirection: 'row', gap: 10,
          }}>
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Send size={18} color="#000" />
                <Text style={{
                  color: '#000', fontWeight: '900', fontSize: 18,
                  fontFamily: 'Boogaloo_400Regular', letterSpacing: 1,
                }}>
                  SHARE REMIX
                </Text>
              </>
            )}
          </View>
        </Pressable>
        <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
          Opens your device share sheet
        </Text>
      </Animated.View>
    </Animated.View>
  );
}
