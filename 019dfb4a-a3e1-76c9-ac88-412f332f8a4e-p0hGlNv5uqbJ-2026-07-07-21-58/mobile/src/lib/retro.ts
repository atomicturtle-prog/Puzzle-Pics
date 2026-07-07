export const R = {
  BG: '#0B0B14',
  CARD: '#13131F',
  PINK: '#FF2D95',
  YELLOW: '#FFE600',
  TEAL: '#00F5D4',
  CYAN: '#00F5D4',
  PURPLE: '#9B5DE5',
  GREEN: '#B8FF00',
  ORANGE: '#FF6B35',
  WHITE: '#FFFFFF',
  BLACK: '#000000',
} as const;

// Expanded 90s sticker icon set
export const STICKER_ICONS = [
  '⭐', '⚡', '💎', '🔥', '🌀', '🎯', '🍕', '👾', '🎮', '🏆',
  '🌟', '💥', '😎', '🌈', '🤖', '💿', '👽', '❤️', '🏄', '🎪',
  '🤘', '🦋', '🎸', '🧲', '🎲',
];

export const STICKER_COLORS = [
  '#FF2D95', '#FFE600', '#00F5D4', '#9B5DE5', '#B8FF00', '#FF6B35',
  '#FF2D95', '#00F5D4', '#FFE600', '#B8FF00',
];

// Neon grain dots — fixed positions for background texture
export const GRAIN_DOTS = Array.from({ length: 60 }, (_, i) => ({
  left: ((i * 137.5) % 100),   // golden-angle-ish spread
  top: ((i * 97.3 + 13) % 100),
  size: (i % 3) + 2,
  opacity: 0.04 + (i % 5) * 0.012,
  colorIndex: i % STICKER_COLORS.length,
}));

export function getStickerIcon(id: string): string {
  if (!id) return '⭐';
  const sum = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return STICKER_ICONS[sum % STICKER_ICONS.length];
}

export function getStickerColor(id: string): string {
  if (!id) return R.PINK;
  const sum = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return STICKER_COLORS[sum % STICKER_COLORS.length];
}

export function stickerShadow(offset = 4) {
  return {
    shadowColor: '#000',
    shadowOffset: { width: offset, height: offset },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: offset + 1,
  };
}

export function stickerStyle(bg: string, radius = 16) {
  return {
    backgroundColor: bg,
    borderRadius: radius,
    borderWidth: 2.5,
    borderColor: 'rgba(0,0,0,0.7)',
    ...stickerShadow(),
  };
}
