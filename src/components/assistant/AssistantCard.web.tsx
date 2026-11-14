// Voice Assistant Card (transitions.dev community, adapted). Web keeps the original
// DOM + CSS motion exactly: durations, easings, blur and the reduced-motion fallback.
// The glow is voice-glow's VoiceBeam driven by the real microphone stream.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { VoiceBeam } from 'voice-glow';
import { colors, palette } from '../../../theme';
import { fontFor } from '../../lib/fonts';
import type { AssistantCardProps } from './types';

const cssMs = (name: string, fb: number) => {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(v) ? v : fb;
};

function SwapText({ value }: { value: string }) {
  const [shown, setShown] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (value === shown) return;
    const el = ref.current;
    if (!el) return;
    el.classList.remove('is-enter-start');
    el.classList.add('is-exit');
    const t = setTimeout(() => setShown(value), cssMs('--text-swap-dur', 150));
    return () => clearTimeout(t);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !el.classList.contains('is-exit')) return;
    el.classList.remove('is-exit');
    el.classList.add('is-enter-start');
    void el.offsetHeight;
    el.classList.remove('is-enter-start');
  }, [shown]);
  return <span ref={ref} className="t-text-swap" aria-live="polite">{shown}</span>;
}

/** Words fade in one frame after they mount, so each new word plays the stream transition. */
function useLaggedCount(n: number) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (n < count) { setCount(n); return; }
    const id = requestAnimationFrame(() => setCount(n));
    return () => cancelAnimationFrame(id);
  }, [n]); // eslint-disable-line react-hooks/exhaustive-deps
  return count;
}

export function AssistantCard(p: AssistantCardProps) {
  const count = useLaggedCount(p.words.length);
  const live = p.phase === 'listening';
  return (
    <div className="va-card" dir={p.rtl ? 'rtl' : 'ltr'} style={{ fontFamily: fontFor(p.lang) }}>
      <style>{CSS}</style>
      <VoiceBeam
        className="va-beam"
        stream={(p.stream as MediaStream | null) ?? null}
        level={0.06}
        processing={p.phase === 'thinking'}
        colors={[palette.teal, '#D9A58A', palette.teal, '#D9A58A']}
      >
        <div className="va-inner">
          <div className="va-content">
            <header className="va-top">
              <span className="t-av" style={{ ['--av-bg' as string]: colors.primarySoft, ['--av-fg' as string]: palette.aubergine, ['--av-size' as string]: '32px' }} role="img" aria-label={p.name}>NX</span>
              <div className="va-top-text">
                <span className="va-name">{p.name}</span>
                <span className="va-meta">{p.meta}</span>
              </div>
            </header>
            <div className="va-divider" aria-hidden="true" />
            <div className="va-body">
              <div className="va-bubble-row">
                <p className="va-bubble" style={{ margin: 0 }}><span>{p.greeting}</span></p>
              </div>
              <p className="va-transcript" key={p.runKey} style={{ margin: 0 }} aria-live="polite">
                {p.words.map((w, i) => (
                  <span key={i}>
                    <span className={'t-stream-w' + (i < count ? ' is-in' : '')}>{w}</span>
                    {i < p.words.length - 1 ? ' ' : ''}
                  </span>
                ))}
              </p>
            </div>
            <div className="va-bottom">
              <span className="va-caption"><SwapText value={p.caption} /></span>
              <button
                type="button"
                className={'va-mic' + (live ? ' is-live' : '')}
                aria-label={p.micLabel}
                aria-pressed={live}
                onClick={p.onMic}
              >
                <span className="va-wave" aria-hidden="true"><i /><i /><i /><i /><i /></span>
              </button>
            </div>
          </div>
        </div>
      </VoiceBeam>
    </div>
  );
}

// --stage-* mapped to NEXTORA tokens. Motion variables are unchanged from the original.
const CSS = `
:root {
  --stage-bg: ${colors.bg}; --stage-fg: ${colors.text}; --stage-muted: ${colors.textMuted};
  --stage-border: ${colors.border}; --stage-surface: ${colors.surface};
  --stage-accent: ${colors.primary}; --stage-on-accent: ${colors.textOnDark};
  --stream-fade: 350ms; --stream-blur: 1px; --stream-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --text-swap-dur: 150ms; --text-swap-translate-y: 4px; --text-swap-blur: 2px; --text-swap-ease: ease-in-out;
  --wave-dur: 900ms; --wave-min: 0.35;
  --float-dur: 4000ms; --float-distance: 3px;
  --press-scale: 0.99; --press-dur: 150ms; --ease-smooth-out: cubic-bezier(0.22, 1, 0.36, 1);
  --va-btn-bg: rgba(255, 255, 255, 0.4);
  --va-btn-shadow: 0 1px 3px 0 rgba(0,0,0,.04), inset 0 0 0 1px rgba(0,0,0,.08), inset 0 -1px 0 0 rgba(0,0,0,.08);
  --va-hover: rgba(0, 0, 0, 0.02);
  --va-card-shadow: 0 0 0 1px rgba(0,0,0,.04), 0 8px 32px -4px rgba(0,0,0,.06), 0 1px 3px 0 rgba(0,0,0,.04);
  --divider: color-mix(in srgb, var(--stage-border) 49%, transparent);
  --bubble: color-mix(in srgb, var(--stage-accent) 10%, var(--stage-surface));
}
.va-card { display: grid; width: 360px; max-width: 100%; min-height: 340px; align-self: center; border-radius: 24px;
  background: var(--stage-surface); box-shadow: var(--va-card-shadow); color: var(--stage-fg); -webkit-font-smoothing: antialiased; }
.va-beam { margin: -1px; border-radius: 25px; }
.va-inner { position: relative; height: 100%; border-radius: 25px; background: transparent; }
.va-content { position: relative; z-index: 5; height: 100%; min-height: 340px; display: flex; flex-direction: column; }
:where(.va-card) button { font: inherit; padding: 0; border: 0; background: none; color: inherit; cursor: pointer; }
.va-top { display: flex; align-items: center; gap: 12px; padding: 16px; }
.va-top-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.va-name { font-size: 16px; line-height: 22px; font-weight: 600; }
.va-meta { font-size: 12px; line-height: 18px; color: var(--stage-muted); }
.va-divider { height: 1px; flex: none; background: linear-gradient(90deg, transparent, var(--divider) 20%, var(--divider) 80%, transparent); }
.va-body { padding: 24px 24px 0; display: flex; flex-direction: column; gap: 16px; }
.va-bubble-row { padding-inline-start: 8px; animation: va-float var(--float-dur) ease-in-out infinite; }
@keyframes va-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(calc(var(--float-distance) * -1)); } }
.va-bubble { position: relative; display: inline-block; max-width: 260px; padding: 8px 12px; border-radius: 18px; background: var(--bubble); font-size: 14px; line-height: 22px; }
.va-bubble span { position: relative; z-index: 1; }
.va-bubble::before { content: ""; position: absolute; bottom: 0; left: -7px; width: 20px; height: 20px; background: var(--bubble); border-bottom-right-radius: 16px 14px; }
.va-bubble::after { content: ""; position: absolute; bottom: 0; left: -26px; width: 26px; height: 20px; background: var(--stage-surface); border-bottom-right-radius: 10px; }
[dir="rtl"] .va-bubble::before { left: auto; right: -7px; border-bottom-right-radius: 0; border-bottom-left-radius: 16px 14px; }
[dir="rtl"] .va-bubble::after { left: auto; right: -26px; border-bottom-right-radius: 0; border-bottom-left-radius: 10px; }
.va-transcript { font-size: 14px; line-height: 22px; color: var(--stage-fg); text-align: end; text-wrap: pretty; padding-inline-start: 32px; }
.t-stream-w { opacity: 0; filter: blur(var(--stream-blur)); transition: opacity var(--stream-fade) var(--stream-ease), filter var(--stream-fade) var(--stream-ease); }
.t-stream-w.is-in { opacity: 1; filter: blur(0); }
.va-bottom { margin-top: auto; padding: 16px 24px 24px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.va-caption { font-size: 12px; line-height: 18px; color: var(--stage-muted); text-align: center; }
.t-text-swap { display: inline-block; transform: translateY(0); filter: blur(0); opacity: 1;
  transition: transform var(--text-swap-dur) var(--text-swap-ease), filter var(--text-swap-dur) var(--text-swap-ease), opacity var(--text-swap-dur) var(--text-swap-ease);
  will-change: transform, filter, opacity; }
.t-text-swap.is-exit { transform: translateY(calc(var(--text-swap-translate-y) * -1)); filter: blur(var(--text-swap-blur)); opacity: 0; }
.t-text-swap.is-enter-start { transform: translateY(var(--text-swap-translate-y)); filter: blur(var(--text-swap-blur)); opacity: 0; transition: none; }
.va-mic { --press-scale: 0.95; width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center;
  background: var(--va-btn-bg); box-shadow: var(--va-btn-shadow); color: var(--stage-fg); transition: transform var(--press-dur) var(--ease-smooth-out); }
:where(.va-card) .va-mic { background: var(--va-btn-bg); }
@media (hover: hover) and (pointer: fine) { .va-mic:hover { background-image: linear-gradient(var(--va-hover), var(--va-hover)); } }
.va-mic:is(:active,.is-pressed) { transform: scale(var(--press-scale)); }
.va-mic:focus-visible { outline: none; box-shadow: var(--va-btn-shadow), 0 0 0 2px var(--stage-surface), 0 0 0 4px var(--stage-accent); }
.va-wave { display: flex; align-items: center; gap: 2px; height: 20px; }
.va-wave i { display: block; width: 2px; border-radius: 1px; background: currentColor; transform-origin: center; }
.va-wave i:nth-child(1) { height: 6px; } .va-wave i:nth-child(2) { height: 12px; } .va-wave i:nth-child(3) { height: 18px; }
.va-wave i:nth-child(4) { height: 12px; } .va-wave i:nth-child(5) { height: 6px; }
.va-mic.is-live .va-wave i { animation: va-wave var(--wave-dur) ease-in-out infinite; }
.va-mic.is-live .va-wave i:nth-child(2) { animation-delay: calc(var(--wave-dur) * -0.3); }
.va-mic.is-live .va-wave i:nth-child(3) { animation-delay: calc(var(--wave-dur) * -0.6); }
.va-mic.is-live .va-wave i:nth-child(4) { animation-delay: calc(var(--wave-dur) * -0.15); }
.va-mic.is-live .va-wave i:nth-child(5) { animation-delay: calc(var(--wave-dur) * -0.45); }
@keyframes va-wave { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(var(--wave-min)); } }
@media (prefers-reduced-motion: reduce) {
  .va-bubble-row, .va-mic.is-live .va-wave i { animation: none !important; }
  .t-text-swap { transition: none !important; }
  .t-stream-w { transition: none !important; filter: none !important; }
  .va-mic { transition: none; }
  .va-mic:is(:active,.is-pressed) { transform: none; }
}
.t-av{display:inline-grid;place-items:center;flex:none;box-sizing:border-box;width:var(--av-size,24px);height:var(--av-size,24px);border-radius:50%;background:var(--av-bg);color:var(--av-fg);font-size:max(10px,calc(var(--av-size,24px) * .4));font-weight:600;line-height:1;letter-spacing:0;user-select:none}
:where(.va-card button){-webkit-tap-highlight-color:transparent;touch-action:manipulation;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
`;
