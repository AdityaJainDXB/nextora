import type { Ionicons } from '@expo/vector-icons';
import type { Persona } from '../store/types';

export const personaIcon: Record<Persona, keyof typeof Ionicons.glyphMap> = {
  justArrived: 'airplane-outline',
  family: 'people-outline',
  moving: 'swap-horizontal-outline',
  belong: 'home-outline',
};
