import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const isTablet = width >= 768;
export const screenWidth = width;

export const MAX_CONTENT_WIDTH = 900;
export const MAX_PLAY_WIDTH = 720;
export const MAX_MODAL_WIDTH = 520;
