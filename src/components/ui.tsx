import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator, Animated, Modal, Pressable, ScrollView, StyleSheet, Switch,
  Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, shadow, space, touch, type as typeScale } from '../../theme';
import { fontFor, type Weight } from '../lib/fonts';
import { useLang } from '../lib/lang';
import { Button as GSButton } from './gs/button';
import { Badge as GSBadge } from './gs/badge';

type Variant = keyof typeof typeScale;

/** Text that always uses the right Noto font for the language on screen. */
export function T({
  children, v = 'body', w = 'regular', color = colors.text, style, lang, center, numberOfLines, ...rest
}: {
  children: React.ReactNode; v?: Variant; w?: Weight; color?: string; style?: StyleProp<TextStyle>;
  lang?: string; center?: boolean; numberOfLines?: number; accessibilityRole?: 'header' | 'text';
}) {
  const { shown, isRTL } = useLang();
  const code = lang ?? shown;
  return (
    <Text
      {...rest}
      numberOfLines={numberOfLines}
      style={[
        typeScale[v],
        { fontFamily: fontFor(code, w), color, textAlign: center ? 'center' : isRTL ? 'right' : 'left' },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Button({
  label, onPress, kind = 'primary', icon, disabled, a11y, small, style, textColor,
}: {
  label: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'light' | 'outlineLight';
  icon?: keyof typeof Ionicons.glyphMap; disabled?: boolean; a11y?: string; small?: boolean; style?: StyleProp<ViewStyle>;
  textColor?: string;
}) {
  // Built on gluestack-ui's Button; NEXTORA tokens live in gs/gluestack-ui-provider/config.ts.
  const variant = ({ primary: 'default', secondary: 'outline', ghost: 'ghost', danger: 'destructive', light: 'secondary', outlineLight: 'outline' } as const)[kind];
  const fg = textColor ?? {
    primary: colors.textOnDark, secondary: colors.text, ghost: colors.primary, danger: colors.textOnDark, light: colors.night, outlineLight: colors.textOnDark,
  }[kind];
  const { isRTL } = useLang();
  const flip = isRTL && !!icon && /arrow-(forward|back)|chevron|send/.test(icon);
  const c = disabled ? colors.disabled : fg;
  return (
    <GSButton
      variant={variant}
      onPress={onPress}
      isDisabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      accessibilityState={{ disabled: !!disabled }}
      className={`${small ? 'px-3 py-1.5' : 'px-4 py-2.5'} ${kind === 'outlineLight' ? 'bg-transparent border-white/70' : ''} ${disabled ? 'opacity-100 bg-secondary border border-border' : ''} ${textColor && kind === 'ghost' ? 'data-[hover=true]:bg-white/10 data-[active=true]:bg-white/10' : ''}`}
      style={[{ minHeight: small ? 36 : touch }, style]}
    >
      {icon ? <Ionicons name={icon} size={small ? 15 : 17} color={c} style={flip ? { transform: [{ scaleX: -1 }] } : undefined} /> : null}
      <T v={small ? 'small' : 'body'} w="semibold" color={c} center style={{ flexShrink: 1 }}>{label}</T>
    </GSButton>
  );
}

export function Chip({
  label, selected, onPress, disabled, icon,
}: { label: string; selected?: boolean; onPress?: () => void; disabled?: boolean; icon?: keyof typeof Ionicons.glyphMap }) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole={onPress ? 'checkbox' : 'text'}
      accessibilityState={{ checked: !!selected, disabled: !!disabled }}
      aria-checked={!!selected}
      aria-disabled={!!disabled || undefined}
      accessibilityLabel={`${label}, ${selected ? t('common.selected') : t('common.notSelected')}`}
      style={[styles.chip, selected && styles.chipOn, disabled && { opacity: 0.5 }]}
    >
      {selected ? <Ionicons name="checkmark" size={16} color={colors.textOnDark} /> : icon ? <Ionicons name={icon} size={16} color={colors.textMuted} /> : null}
      <T v="small" w="semibold" color={selected ? colors.textOnDark : colors.text}>{label}</T>
    </Pressable>
  );
}

export function Tag({ label, tone = 'muted' }: { label: string; tone?: 'muted' | 'clay' | 'ink' | 'warning' | 'danger' }) {
  const map = {
    muted: [colors.surfaceAlt, colors.textMuted],
    clay: [colors.accentSoft, colors.accentText],
    ink: [colors.primarySoft, colors.primary],
    warning: [colors.warningSoft, colors.warning],
    danger: [colors.dangerSoft, colors.danger],
  }[tone];
  return (
    <GSBadge className="self-start rounded px-2 py-0.5" style={{ backgroundColor: map[0] }}>
      <T v="tiny" w="semibold" color={map[1]}>{label}</T>
    </GSBadge>
  );
}

export function Card({ children, style, onPress, a11y }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; a11y?: string }) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] }]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Row({ children, gap = space.sm, style, wrap }: { children: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle>; wrap?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, wrap && { flexWrap: 'wrap' }, style]}>{children}</View>;
}

export function Progress({ value, label }: { value: number; label: string }) {
  const anim = useRef(new Animated.Value(value)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: value, duration: 300, useNativeDriver: false }).start();
  }, [value, anim]);
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }} style={styles.track}>
      <Animated.View style={[styles.fill, { width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}

const hueColor = { ink: colors.ink, clay: colors.accentText, night: colors.night };
export function Avatar({ initials, hue = 'ink', size = 48 }: { initials: string; hue?: keyof typeof hueColor; size?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: hueColor[hue], alignItems: 'center', justifyContent: 'center' }}
    >
      <T w="bold" color={colors.textOnDark} lang="en" center v={size > 40 ? 'h2' : 'small'}>{initials}</T>
    </View>
  );
}

export function TextBadge({ text, size = 52 }: { text: string; size?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}
    >
      <T w="bold" lang="en" color={colors.primary} v={text.length > 2 ? 'tiny' : 'small'} center>{text}</T>
    </View>
  );
}

export function Empty({ icon = 'leaf-outline', text, action }: { icon?: keyof typeof Ionicons.glyphMap; text: string; action?: React.ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={28} color={colors.primary} /></View>
      <T center color={colors.textMuted}>{text}</T>
      {action}
    </View>
  );
}

export function Loading() {
  const { t } = useTranslation();
  return (
    <View style={[styles.empty, { flex: 1, justifyContent: 'center' }]} accessibilityLabel={t('common.loading')}>
      <ActivityIndicator color={colors.primary} size="large" />
      <T color={colors.textMuted}>{t('common.loading')}</T>
    </View>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return <Empty icon="alert-circle-outline" text={t('common.error')} action={<Button label={t('common.retry')} onPress={onRetry} kind="secondary" />} />;
}

export function ToggleRow({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <Row style={styles.toggleRow} gap={space.md}>
      <View style={{ flex: 1 }}>
        <T v="small" w="semibold">{label}</T>
        {hint ? <T v="tiny" color={colors.textMuted}>{hint}</T> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: colors.accent, false: colors.border }}
        thumbColor={colors.surface}
      />
    </Row>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  const { shown, isRTL } = useLang();
  return (
    <View style={{ gap: space.xs }}>
      <T v="small" w="semibold">{label}</T>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        {...props}
        style={[styles.input, { fontFamily: fontFor(shown), textAlign: isRTL ? 'right' : 'left' }, props.style]}
      />
      {hint ? <T v="tiny" color={colors.textMuted}>{hint}</T> : null}
    </View>
  );
}

export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel={t('common.close')} accessibilityRole="button" />
      <View style={styles.sheet}>
        <Row style={{ justifyContent: 'space-between', marginBottom: space.md }}>
          <T v="h2" w="bold" style={{ flex: 1 }} accessibilityRole="header">{title}</T>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} style={styles.iconBtn}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </Row>
        <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </View>
    </Modal>
  );
}

export function IconButton({ icon, label, onPress, color = colors.text }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.iconBtn} hitSlop={4}>
      <Ionicons name={icon} size={22} color={color} />
    </Pressable>
  );
}

export function Toast({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <View style={styles.toast} accessibilityLiveRegion="polite" pointerEvents="none">
      <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
      <T v="small" color={colors.textOnDark} style={{ flexShrink: 1 }}>{text}</T>
    </View>
  );
}

export function useToast(): [string | null, (s: string) => void] {
  const [msg, setMsg] = React.useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = (s: string) => {
    setMsg(s);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2400);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return [msg, show];
}

export const styles = StyleSheet.create({
  pad: { padding: space.md, gap: space.md },
  frame: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center' },
  footer: { padding: space.md, borderTopWidth: 1, borderTopColor: colors.border, width: '100%', maxWidth: 640, alignSelf: 'center' },
  btn: {
    minHeight: touch, paddingHorizontal: space.md, paddingVertical: 10, borderRadius: radius.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, borderWidth: 1.5,
  },
  btnSmall: { paddingHorizontal: 12, paddingVertical: 6 },
  chip: {
    minHeight: 40, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.sm, alignSelf: 'flex-start' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, gap: space.sm, borderWidth: 1, borderColor: colors.border, ...shadow },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.accent },
  empty: { alignItems: 'center', gap: space.md, padding: space.xl },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  toggleRow: { minHeight: touch, paddingVertical: space.xs },
  input: {
    minHeight: touch, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface, color: colors.text, fontSize: 16,
  },
  scrim: { flex: 1, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.bg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: space.lg, maxHeight: '85%', width: '100%', maxWidth: 640, alignSelf: 'center',
  },
  iconBtn: { width: touch, height: touch, alignItems: 'center', justifyContent: 'center', borderRadius: touch / 2 },
  toast: {
    position: 'absolute', bottom: space.lg, left: space.md, right: space.md, backgroundColor: colors.night,
    borderRadius: radius.md, padding: space.md, flexDirection: 'row', gap: space.sm, alignItems: 'center',
  },
});

/** Calendar-style date block for events: month above a large day number. */
export function DateBadge({ date, lang }: { date: Date; lang: string }) {
  return (
    <View accessible={false} style={{ width: 56, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
      <View style={{ alignSelf: 'stretch', backgroundColor: colors.primary, paddingVertical: 2 }}>
        <T v="tiny" w="bold" color={colors.textOnDark} center>{date.toLocaleDateString(lang, { month: 'short' }).toUpperCase()}</T>
      </View>
      <T v="h2" w="bold" center>{date.getDate()}</T>
      <T v="tiny" color={colors.textMuted} center>{date.toLocaleDateString(lang, { weekday: 'short' })}</T>
    </View>
  );
}
