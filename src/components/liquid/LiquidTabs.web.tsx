import React from 'react';
import { Asset } from 'expo-asset';
import { ICONS } from '../icons/registry';
import { Ionicons } from '@expo/vector-icons';
import { LiquidNavbar } from './liquid-glass-navbar';
import { fontFor } from '../../lib/fonts';
import { useLang } from '../../lib/lang';
import type { LiquidTabsProps } from './types';


/** Web: the Nimbus liquid-glass navbar. */
export function LiquidTabs({ items, value, onChange, tone = 'light', compact, ariaLabel, stretch }: LiquidTabsProps) {
  const { shown } = useLang();
  const active = Math.max(0, items.findIndex((i) => i.key === value));
  return (
    <LiquidNavbar
      tone={tone}
      compact={compact}
      active={active}
      ariaLabel={ariaLabel}
      onChange={(i) => onChange(items[i].key)}
      style={{ fontFamily: fontFor(shown, 'semibold'), ...(stretch ? { display: 'flex', justifyContent: 'space-between' } : null) }}
      items={items.map((it, i) => ({
        label: it.label,
        icon: it.art
          ? <img src={Asset.fromModule(ICONS[it.art][i === active && tone !== 'dark' ? 'clay' : 'ink']).uri} width={24} height={24} alt="" draggable={false} />
          : it.icon ? <Ionicons name={it.icon} size={18} color="currentColor" /> : undefined,
        fx: it.icon || it.art ? 'pop' : 'none',
      }))}
    />
  );
}
