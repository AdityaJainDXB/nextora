import type { Ionicons } from '@expo/vector-icons';

export interface LiquidTabItem<K extends string = string> {
  key: K;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export interface LiquidTabsProps<K extends string = string> {
  items: LiquidTabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  tone?: 'light' | 'dark';
  /** icons only (labels stay as accessibility labels) */
  compact?: boolean;
  ariaLabel: string;
  stretch?: boolean;
}
