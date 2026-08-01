import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Camera, Check, ChevronLeft, ImageIcon, Trash2, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PuzzleMarker } from '@/components/PuzzleMarker';
import { ZoomableTapImage } from '@/components/ZoomableTapImage';
import { isTablet, MAX_CONTENT_WIDTH } from '@/lib/device';
import { R, stickerStyle, stickerShadow } from '@/lib/retro';
import usePuzzleStore, { type PuzzleObject } from '@/lib/state/puzzleStore';

type Step = 'image' | 'tag' | 'finish';

type SelectedImage = {
  uri: string;
  width: number;
  height: number;
};

export default function CreateScreen() {
  const insets = useSafeAreaInsets();
  const addPuzzle = usePuzzleStore((s) => s.addPuzzle);

  const [step, setStep] = useState<Step>('image');
  const [image, setImage] = useState<SelectedImage | null>(null);
  const [objects, setObjects] = useState<PuzzleObject[]>([]);
  const [pendingPoint, setPendingPoint] = useState<{ x: number; y: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [title, setTitle] = useState('Find the Hidden Objects');
  const [imgLayout, setImgLayout] = useState<{ width: number; height: number } | null>(null);

  const pickImage = async (source: 'camera' | 'library') => {
    try {
      const perm =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.85,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.85,
            });

      if (result.canceled || !result.assets?.[0]) return;
      const a = result.assets[0];
      setImage({ uri: a.uri, width: a.width ?? 1, height: a.height ?? 1 });
      setObjects([]);
      setStep('tag');
    } catch {
      // ignore
    }
  };

  const handleImageTap = (xRel: number, yRel: number) => {
    // Ignore taps that land on an existing marker — tapping a marker selects it,
    // and dragging moves it. This keeps tap-to-add from stacking on top of one.
    const onExisting = objects.some(
      (o) => Math.hypot(o.x - xRel, o.y - yRel) < 0.05
    );
    if (onExisting) return;
    setPendingPoint({ x: xRel, y: yRel });
    setNameDraft('');
    setEditingId(null);
    Haptics.selectionAsync().catch(() => {});
  };

  const confirmPending = () => {
    if (!pendingPoint || !nameDraft.trim()) return;
    const o: PuzzleObject = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: nameDraft.trim(),
      x: pendingPoint.x,
      y: pendingPoint.y,
    };
    setObjects((prev) => [...prev, o]);
    setPendingPoint(null);
    setNameDraft('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const cancelPending = () => {
    setPendingPoint(null);
    setNameDraft('');
  };

  const renameObject = (id: string, name: string) => {
    setObjects((prev) => prev.map((o) => (o.id === id ? { ...o, name } : o)));
  };

  const deleteObject = (id: string) => {
    setObjects((prev) => prev.filter((o) => o.id !== id));
    setEditingId(null);
  };

  const moveObject = (id: string, x: number, y: number) => {
    setObjects((prev) => prev.map((o) => (o.id === id ? { ...o, x, y } : o)));
  };

  const savePuzzle = () => {
    if (!image || objects.length === 0) return;
    addPuzzle({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim() || 'Find the Hidden Objects',
      imageUri: image.uri,
      imageWidth: image.width,
      imageHeight: image.height,
      objects,
      createdAt: Date.now(),
    });
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: R.BG }}
    >
      <View style={{ flex: 1 }}>
        {/* Nav bar */}
        <View
          style={{
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: insets.top + 8,
            paddingBottom: 8,
          }}
        >
          <Pressable
            testID="create-back"
            onPress={() => (step === 'image' ? router.back() : setStep(prevStep(step)))}
            style={{
              width: 40, height: 40, borderRadius: 12,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.07)',
              borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)',
            }}
          >
            <ChevronLeft size={22} color={R.WHITE} />
          </Pressable>
          <StepIndicator step={step} />
          <View style={{ width: 40 }} />
        </View>

        {step === 'image' ? (
          <ImageStep onPick={pickImage} />
        ) : step === 'tag' && image ? (
          <TagStep
            image={image}
            objects={objects}
            pendingPoint={pendingPoint}
            nameDraft={nameDraft}
            editingId={editingId}
            imgLayout={imgLayout}
            onLayoutImg={setImgLayout}
            onTapImage={handleImageTap}
            onChangeNameDraft={setNameDraft}
            onConfirmPending={confirmPending}
            onCancelPending={cancelPending}
            onSelectObject={(id) => setEditingId(id)}
            onCloseEditor={() => setEditingId(null)}
            onRenameObject={renameObject}
            onDeleteObject={deleteObject}
            onMoveObject={moveObject}
            onContinue={() => {
  console.log('CONTINUE CLICKED');
  setStep('finish');
}}
          />
        ) : step === 'finish' && image ? (
          <FinishStep
            image={image}
            title={title}
            onChangeTitle={setTitle}
            objectCount={objects.length}
            onSave={savePuzzle}
          />
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

function prevStep(step: Step): Step {
  if (step === 'finish') return 'tag';
  if (step === 'tag') return 'image';
  return 'image';
}

function StepIndicator({ step }: { step: Step }) {
  const order: Step[] = ['image', 'tag', 'finish'];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {order.map((s) => {
        const active = order.indexOf(step) >= order.indexOf(s);
        return (
          <View
            key={s}
            style={{
              width: active ? 28 : 8,
              height: 6,
              borderRadius: 3,
              backgroundColor: active ? R.YELLOW : 'rgba(255,255,255,0.15)',
              borderWidth: active ? 1.5 : 0,
              borderColor: 'rgba(0,0,0,0.3)',
            }}
          />
        );
      })}
    </View>
  );
}

function ImageStep({ onPick }: { onPick: (s: 'camera' | 'library') => void }) {
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: isTablet ? 40 : 24, paddingTop: 16, paddingBottom: 80, alignItems: isTablet ? 'center' : undefined }}>
      <Animated.View entering={FadeInDown.springify()}>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 6 }}>
          Step 1 of 3
        </Text>
        <Text style={{ color: R.WHITE, fontSize: 36, fontFamily: 'Boogaloo_400Regular', lineHeight: 40 }}>
          PICK A{'\n'}<Text style={{ color: R.PINK }}>PHOTO</Text>
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 10, lineHeight: 20, fontSize: 14 }}>
          Choose any picture with lots of details. The more visual texture, the better the hide-and-seek.
        </Text>
      </Animated.View>

      <View style={{ marginTop: 32, gap: 12, width: '100%', maxWidth: isTablet ? 600 : undefined }}>
        <ImageSourceCard
          testID="pick-camera"
          icon={<Camera size={22} color="#000" />}
          color={R.YELLOW}
          title="Take a Photo"
          subtitle="Use your camera right now"
          onPress={() => onPick('camera')}
        />
        <ImageSourceCard
          testID="pick-library"
          icon={<ImageIcon size={22} color="#000" />}
          color={R.CYAN}
          title="Choose from Gallery"
          subtitle="Pick a saved photo"
          onPress={() => onPick('library')}
        />
      </View>
    </ScrollView>
  );
}

function ImageSourceCard({
  icon,
  color,
  title,
  subtitle,
  onPress,
  testID,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable testID={testID} onPress={onPress} className="active:opacity-85">
      <View style={{
        ...stickerStyle(color, 18),
        flexDirection: 'row', alignItems: 'center', padding: 18, gap: 16,
      }}>
        <View style={{
          width: 48, height: 48, borderRadius: 14,
          backgroundColor: 'rgba(0,0,0,0.2)',
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 2, borderColor: 'rgba(0,0,0,0.25)',
        }}>
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 0.3 }}>{title}</Text>
          <Text style={{ color: 'rgba(0,0,0,0.55)', fontSize: 12, marginTop: 2 }}>{subtitle}</Text>
        </View>
      </View>
    </Pressable>
  );
}

type TagStepProps = {
  image: SelectedImage;
  objects: PuzzleObject[];
  pendingPoint: { x: number; y: number } | null;
  nameDraft: string;
  editingId: string | null;
  imgLayout: { width: number; height: number } | null;
  onLayoutImg: (l: { width: number; height: number }) => void;
  onTapImage: (xRel: number, yRel: number) => void;
  onChangeNameDraft: (v: string) => void;
  onConfirmPending: () => void;
  onCancelPending: () => void;
  onSelectObject: (id: string) => void;
  onCloseEditor: () => void;
  onRenameObject: (id: string, name: string) => void;
  onDeleteObject: (id: string) => void;
  onMoveObject: (id: string, x: number, y: number) => void;
  onContinue: () => void;
};

function TagStep(props: TagStepProps) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  // Shared zoom scale, mirrored into the markers so dragging stays accurate
  // while the image is pinched-zoomed.
  const zoomScale = useSharedValue(1);
  const editing = useMemo(
    () => props.objects.find((o) => o.id === props.editingId) ?? null,
    [props.objects, props.editingId]
  );

  useEffect(() => {
    if (props.pendingPoint) {
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [props.pendingPoint]);

  const aspect = props.image.height > 0 ? props.image.width / props.image.height : 1;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
        <Text style={{ color: R.WHITE, fontSize: 22, fontFamily: 'Boogaloo_400Regular', letterSpacing: 0.5 }}>
          TAP TO <Text style={{ color: R.CYAN }}>TAG OBJECTS</Text>
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 3 }}>
          Touch a spot, name it. Drag a marker to move it.
        </Text>
      </View>

      <View style={{ flex: 1, paddingHorizontal: isTablet ? 32 : 12, justifyContent: 'center', alignItems: 'center' }}>
        <ZoomableTapImage
          testID="tag-image-tap"
          uri={props.image.uri}
          aspectRatio={aspect}
          scale={zoomScale}
          panPointers={2}
          enableDoubleTap={false}
          maxScale={5}
          onLayoutSize={props.onLayoutImg}
          onTap={props.onTapImage}
          style={{
            maxWidth: isTablet ? 720 : undefined,
            borderRadius: 16,
            backgroundColor: '#000',
            borderWidth: 2.5,
            borderColor: 'rgba(255,255,255,0.12)',
          }}
        >
          {props.imgLayout
            ? props.objects.map((o) => (
                <DraggableMarker
                  key={o.id}
                  object={o}
                  layoutWidth={props.imgLayout!.width}
                  layoutHeight={props.imgLayout!.height}
                  scale={zoomScale}
                  selected={props.editingId === o.id}
                  onSelect={() => props.onSelectObject(o.id)}
                  onMove={(x, y) => props.onMoveObject(o.id, x, y)}
                />
              ))
            : null}
          {props.pendingPoint && props.imgLayout ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: props.pendingPoint.x * props.imgLayout.width - 14,
                top: props.pendingPoint.y * props.imgLayout.height - 14,
              }}
            >
              <PuzzleMarker selected />
            </View>
          ) : null}
        </ZoomableTapImage>
        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 8, textAlign: 'center' }}>
          Pinch to zoom · drag with two fingers to pan
        </Text>

        <View style={{ marginTop: 12, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{
            paddingHorizontal: 12, paddingVertical: 6,
            backgroundColor: props.objects.length > 0 ? R.GREEN : 'rgba(255,255,255,0.07)',
            borderRadius: 10,
            borderWidth: 1.5, borderColor: props.objects.length > 0 ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.1)',
          }}>
            <Text style={{
              fontSize: 12, fontWeight: '900', letterSpacing: 0.5,
              color: props.objects.length > 0 ? '#000' : 'rgba(255,255,255,0.45)',
            }}>
              {props.objects.length} TAGGED
            </Text>
          </View>
          <Pressable
            testID="tag-continue"
            disabled={props.objects.length < 1}
            onPress={props.onContinue}
            style={{ opacity: props.objects.length < 1 ? 0.35 : 1 }}
          >
            <View style={{
              ...stickerStyle(R.PINK, 12),
              paddingHorizontal: 20, paddingVertical: 10,
            }}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 }}>CONTINUE →</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {props.objects.length > 0 ? (
        <View style={{ paddingBottom: insets.bottom + 8 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}
            style={{ flexGrow: 0 }}
          >
            {props.objects.map((o) => (
              <Pressable
                key={o.id}
                testID={`object-chip-${o.id}`}
                onPress={() => props.onSelectObject(o.id)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 6,
                  borderRadius: 10,
                  backgroundColor: props.editingId === o.id ? R.YELLOW : 'rgba(255,255,255,0.08)',
                  borderWidth: 1.5,
                  borderColor: props.editingId === o.id ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.12)',
                }}
              >
                <Text style={{
                  fontSize: 12, fontWeight: '700',
                  color: props.editingId === o.id ? '#000' : R.WHITE,
                }}>
                  {o.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {props.pendingPoint ? (
        <NameInputSheet
          inputRef={inputRef}
          value={props.nameDraft}
          onChange={props.onChangeNameDraft}
          onConfirm={props.onConfirmPending}
          onCancel={props.onCancelPending}
        />
      ) : null}

      {editing ? (
        <ObjectEditorSheet
          object={editing}
          onClose={props.onCloseEditor}
          onRename={(name) => props.onRenameObject(editing.id, name)}
          onDelete={() => props.onDeleteObject(editing.id)}
        />
      ) : null}
    </View>
  );
}

function DraggableMarker({
  object,
  layoutWidth,
  layoutHeight,
  scale,
  selected,
  onSelect,
  onMove,
}: {
  object: PuzzleObject;
  layoutWidth: number;
  layoutHeight: number;
  scale: SharedValue<number>;
  selected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
}) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const dragging = useSharedValue(0);

  const finalize = (xRel: number, yRel: number) => {
    onMove(xRel, yRel);
    tx.value = withSpring(0);
    ty.value = withSpring(0);
  };

  const pan = Gesture.Pan()
    .onStart(() => {
      dragging.value = withSpring(1);
      runOnJS(onSelect)();
    })
    .onUpdate((e) => {
      // The marker lives inside the zoomed image, so divide finger movement by
      // the current scale to keep it tracking under the fingertip.
      tx.value = e.translationX / scale.value;
      ty.value = e.translationY / scale.value;
    })
    .onEnd(() => {
      const newX = (object.x * layoutWidth + tx.value) / layoutWidth;
      const newY = (object.y * layoutHeight + ty.value) / layoutHeight;
      const clampedX = Math.max(0, Math.min(1, newX));
      const clampedY = Math.max(0, Math.min(1, newY));
      dragging.value = withSpring(0);
      runOnJS(finalize)(clampedX, clampedY);
    });

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(onSelect)();
  });

  const composed = Gesture.Simultaneous(pan, tap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: 1 + dragging.value * 0.2 },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: object.x * layoutWidth - 18,
            top: object.y * layoutHeight - 18,
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
          },
          animatedStyle,
        ]}
      >
        <PuzzleMarker selected={selected} size={32} />
      </Animated.View>
    </GestureDetector>
  );
}

function NameInputSheet({
  inputRef,
  value,
  onChange,
  onConfirm,
  onCancel,
}: {
  inputRef: React.RefObject<TextInput | null>;
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={{
        position: 'absolute',
        left: 0, right: 0, bottom: 0,
        paddingBottom: insets.bottom + 12,
        paddingHorizontal: 16,
        paddingTop: 18,
        backgroundColor: '#161616',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 2.5,
        borderColor: R.YELLOW,
      }}
    >
      <Text style={{ color: R.YELLOW, fontSize: 10, fontWeight: '900', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 10 }}>
        Name This Object
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TextInput
          ref={inputRef}
          testID="name-input"
          value={value}
          onChangeText={onChange}
          onSubmitEditing={onConfirm}
          placeholder="e.g. red cup, dog, key"
          placeholderTextColor="rgba(255,255,255,0.25)"
          autoFocus
          returnKeyType="done"
          style={{
            flex: 1,
            color: R.WHITE,
            fontSize: 17,
            fontWeight: '700',
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.12)',
          }}
        />
        <Pressable
          testID="name-cancel"
          onPress={onCancel}
          style={{
            width: 44, height: 44, borderRadius: 12,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.07)',
            borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)',
          }}
        >
          <X size={18} color="rgba(255,255,255,0.6)" />
        </Pressable>
        <Pressable
          testID="name-confirm"
          disabled={!value.trim()}
          onPress={onConfirm}
          style={{
            width: 44, height: 44,
            alignItems: 'center', justifyContent: 'center',
            ...stickerStyle(value.trim() ? R.YELLOW : 'rgba(255,255,255,0.08)', 12),
          }}
        >
          <Check size={20} color={value.trim() ? '#000' : 'rgba(255,255,255,0.3)'} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

function ObjectEditorSheet({
  object,
  onClose,
  onRename,
  onDelete,
}: {
  object: PuzzleObject;
  onClose: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(object.name);

  useEffect(() => {
    setName(object.name);
  }, [object.id, object.name]);

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={{
        position: 'absolute',
        left: 0, right: 0, bottom: 0,
        paddingBottom: insets.bottom + 12,
        paddingHorizontal: 16,
        paddingTop: 18,
        backgroundColor: '#161616',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 2.5,
        borderColor: R.CYAN,
      }}
    >
      <Text style={{ color: R.CYAN, fontSize: 10, fontWeight: '900', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 10 }}>
        Edit Object
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TextInput
          testID="rename-input"
          value={name}
          onChangeText={(v) => {
            setName(v);
            onRename(v);
          }}
          placeholder="Object name"
          placeholderTextColor="rgba(255,255,255,0.25)"
          style={{
            flex: 1,
            color: R.WHITE,
            fontSize: 17,
            fontWeight: '700',
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.12)',
          }}
        />
        <Pressable
          testID="rename-delete"
          onPress={onDelete}
          style={{
            width: 44, height: 44, borderRadius: 12,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(255,45,107,0.15)',
            borderWidth: 1.5, borderColor: 'rgba(255,45,107,0.3)',
          }}
        >
          <Trash2 size={18} color={R.PINK} />
        </Pressable>
        <Pressable
          testID="rename-close"
          onPress={onClose}
          style={{
            width: 44, height: 44,
            alignItems: 'center', justifyContent: 'center',
            ...stickerStyle(R.YELLOW, 12),
          }}
        >
          <Check size={20} color="#000" />
        </Pressable>
      </View>
    </Animated.View>
  );
}

function FinishStep({
  image,
  title,
  onChangeTitle,
  objectCount,
  onSave,
}: {
  image: SelectedImage;
  title: string;
  onChangeTitle: (v: string) => void;
  objectCount: number;
  onSave: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: isTablet ? 40 : 24, paddingTop: 8, paddingBottom: 60, alignItems: isTablet ? 'center' : undefined }}>
      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 6 }}>
        Step 3 of 3
      </Text>
      <Text style={{ color: R.WHITE, fontSize: 34, fontFamily: 'Boogaloo_400Regular', lineHeight: 38 }}>
        ALMOST <Text style={{ color: R.GREEN }}>DONE!</Text>
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 8, lineHeight: 20, fontSize: 14 }}>
        Give your puzzle a title. {objectCount} object{objectCount === 1 ? '' : 's'} ready to be hidden.
      </Text>

      <View style={{ width: '100%', maxWidth: isTablet ? 560 : undefined }}>
        <View style={{
          marginTop: 20,
          alignSelf: 'center',
          backgroundColor: '#faf9f6',
          paddingTop: 10,
          paddingLeft: 10,
          paddingRight: 10,
          paddingBottom: 30,
          shadowColor: '#000',
          shadowOffset: { width: 2, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: isTablet ? 14 : 8,
          elevation: 8,
          transform: [{ rotate: '-1.5deg' }],
          width: isTablet ? 320 : '100%',
        }}>
          <Image
            source={{ uri: image.uri }}
            style={{ width: '100%', aspectRatio: image.width / image.height, borderRadius: 2 }}
            contentFit="cover"
          />
        </View>

        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '800', letterSpacing: 2.5, textTransform: 'uppercase', marginTop: 24, marginBottom: 8 }}>
          Puzzle Title
        </Text>
        <TextInput
          testID="title-input"
          value={title}
          onChangeText={onChangeTitle}
          placeholder="Find the Hidden Objects"
          placeholderTextColor="rgba(255,255,255,0.25)"
          style={{
            color: R.WHITE,
            fontSize: isTablet ? 20 : 18,
            fontWeight: '800',
            padding: isTablet ? 20 : 16,
            borderRadius: 14,
            backgroundColor: R.CARD,
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.1)',
          }}
        />

        <Pressable testID="save-puzzle" onPress={onSave} style={{ marginTop: 24 }} className="active:opacity-90">
          <View style={{
            ...stickerStyle(R.PINK, 18),
            padding: isTablet ? 24 : 20,
            alignItems: 'center',
          }}>
            <Text style={{ color: '#fff', fontSize: isTablet ? 24 : 20, fontFamily: 'Boogaloo_400Regular', letterSpacing: 1 }}>
              SAVE PUZZLE ✓
            </Text>
          </View>
        </Pressable>
      </View>
    </ScrollView>
  );
}
