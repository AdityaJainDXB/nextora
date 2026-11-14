import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LiquidNavbar, type NimbusFx } from './liquid-glass-navbar';
import { fontFor } from '../../lib/fonts';
import { useLang } from '../../lib/lang';
import type { LiquidTabsProps } from './types';

const fxCycle: NimbusFx[] = ['glow', 'spin', 'pop', 'wave', 'drop'];

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
        icon: it.icon ? <Ionicons name={it.icon} size={18} color="currentColor" /> : undefined,
        fx: it.icon ? fxCycle[i % fxCycle.length] : 'none',
      }))}
    />
  );
}
