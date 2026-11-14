---
name: NEXTORA
description: Arrive. Settle. Thrive. Belong.
colors:
  harbour-ink: "#16233F"
  harbour-ink-soft: "#E6EAF2"
  desert-clay: "#B4532A"
  desert-clay-text: "#8A3A18"
  desert-clay-soft: "#F4E6DD"
  desert-clay-on-dark: "#F0B08E"
  night: "#141A26"
  paper: "#F7F5F0"
  surface: "#FFFFFF"
  sand: "#EFEBE3"
  rule: "#E2DDD3"
  slate: "#545B6B"
  mist-on-dark: "#C9D0DE"
  disabled: "#6B6878"
  success: "#126B63"
  warning: "#8A5A00"
  warning-soft: "#FFF2D6"
  danger: "#B3261E"
  danger-soft: "#FBE4E2"
typography:
  display:
    fontFamily: "Noto Sans (per-script Noto family), system fallback"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: "40px"
  headline:
    fontFamily: "Noto Sans (per-script Noto family), system fallback"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "34px"
  title:
    fontFamily: "Noto Sans (per-script Noto family), system fallback"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: "28px"
  body:
    fontFamily: "Noto Sans (per-script Noto family), system fallback"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "25px"
  label:
    fontFamily: "Noto Sans (per-script Noto family), system fallback"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "21px"
  caption:
    fontFamily: "Noto Sans (per-script Noto family), system fallback"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "18px"
rounded:
  xs: "4px"
  sm: "6px"
  md: "10px"
  lg: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.harbour-ink}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.night}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    height: "44px"
  button-secondary-pressed:
    backgroundColor: "{colors.desert-clay-soft}"
  button-light:
    backgroundColor: "{colors.sand}"
    textColor: "{colors.night}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    height: "44px"
  button-ghost:
    textColor: "{colors.harbour-ink}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    height: "44px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "16px"
  card-done:
    backgroundColor: "{colors.desert-clay-soft}"
  hero-panel:
    backgroundColor: "{colors.harbour-ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "24px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.night}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "40px"
  chip-selected:
    backgroundColor: "{colors.harbour-ink}"
    textColor: "{colors.surface}"
  tag:
    backgroundColor: "{colors.sand}"
    textColor: "{colors.slate}"
    typography: "{typography.caption}"
    rounded: "{rounded.xs}"
    padding: "2px 8px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.night}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
    height: "44px"
  tab-bar:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "6px"
    height: "64px"
  tab-active:
    backgroundColor: "{colors.sand}"
    textColor: "{colors.night}"
    rounded: "{rounded.pill}"
  toast:
    backgroundColor: "{colors.night}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "16px"
---

# Design System: NEXTORA

## Overview

**Creative North Star: "The Welcome Desk"**

NEXTORA should feel like a kind person at an arrivals desk who hands you the right form, in your language, and tells you plainly what to do next. The world is ink on warm paper: a deep Harbour Ink for authority and calm, a single warm Desert Clay for progress and encouragement, and a paper-white ground that keeps every screen quiet enough to read when you are tired and reading in a second language.

Density is moderate and list-shaped. Screens are a single column of flat, bordered cards inside a 640px reading frame, each card one task or one fact, with a 44px touch target on everything that responds. Personality comes from restraint and honesty rather than decoration: one dark ink hero panel per screen at most, one shape-only illustration (a rising sun over a skyline of plain blocks, with small circles for people gathering), and no photography.

The system carries 16 languages in their own scripts, including right-to-left Arabic and Urdu. Every visual decision has to survive a line that is twice as long in Malayalam, or mirrored in Urdu.

**Key Characteristics:**
- Ink on warm paper: Harbour Ink and Desert Clay over a paper-white ground.
- Flat at rest: depth from borders and tonal fills, not shadows.
- One column, one task per card, 640px maximum reading width.
- Noto Sans in every script, three weights only.
- A floating pill tab bar whose active "drop" springs to the selected tab.
- Honest states: review tags, "AI-generated" labels and empty states are first-class visual elements.

## Colors

A two-voice palette: a cool, steady ink for structure and action, and a warm clay for progress, with paper neutrals between them.

### Primary
- **Harbour Ink** (`harbour-ink`): primary buttons, selected chips, the hero panel behind the home header and welcome screen, the month strip on event date badges, links and icons on light grounds. It is the colour of "this is the official, safe next step".
- **Harbour Ink Soft** (`harbour-ink-soft`): quiet fills behind icons (empty-state circles, persona icons, text badges) and the "official name" tag.

### Secondary
- **Desert Clay** (`desert-clay`): progress. The progress-bar fill, the switch track when on, the border of a completed checklist card, the toast check icon, the illustration's sun. Never used for body text on light grounds.
- **Desert Clay Text** (`desert-clay-text`): the darkened clay for text, tags and the filled "done" check circle on light grounds.
- **Desert Clay Soft** (`desert-clay-soft`): the background of a completed checklist card and of clay tags.
- **Desert Clay On Dark** (`desert-clay-on-dark`): the tagline, ghost-button text and trust icon on the ink hero.

### Neutral
- **Night** (`night`): all body text, and the toast background.
- **Paper** (`paper`): the app background behind every screen and sheet.
- **Surface** (`surface`): cards, inputs, chips, the light tab-bar pill.
- **Sand** (`sand`): secondary fills: muted tags, the active tab drop, the progress-bar track, the light button on dark grounds.
- **Rule** (`rule`): every 1px border and divider.
- **Slate** (`slate`): secondary text, placeholders, hints.
- **Mist On Dark** (`mist-on-dark`): secondary text on Harbour Ink.
- **Disabled** (`disabled`): disabled controls and "coming soon" language names; it still passes AA so unavailable items stay readable.

### Status
- **Success** (`success`), **Warning** (`warning` on `warning-soft`), **Danger** (`danger` on `danger-soft`): review-status tags, banners and destructive actions only.

### Named Rules
**The Two Voices Rule.** Ink means "act / this is official"; clay means "you made progress". Do not swap them: a primary button is never clay, and a completed state is never ink.

**The AA Floor Rule.** Every text pair must pass WCAG AA (4.5:1 body, 3:1 large). When clay or ink is needed as text on a ground where it fails, use its `-text` or `-on-dark` variant instead.

## Typography

**Display Font:** Noto Sans (with the matching Noto family per script: Arabic, Devanagari, Bengali, Tamil, Telugu, Malayalam, Gujarati, Gurmukhi, Kannada, Sinhala; system font for any other script)
**Body Font:** the same family
**Label Font:** the same family

**Character:** One humanist sans across every script, so a screen in Tamil and a screen in English look like the same product. Hierarchy comes from size and three weights (400, 600, 700), never from a second typeface.

### Hierarchy
- **Display** (700, 30px, 40px line): the welcome headline only.
- **Headline** (700, 24px, 34px line): one screen title per screen, often inside the ink hero.
- **Title** (700, 19px, 28px line): sheet titles, section heads, avatar initials, the day on date badges.
- **Body** (400, 16px, 25px line): all reading text, button labels (at 600), input text. Line height stays generous because Indic and Arabic scripts need the vertical room.
- **Label** (600, 14px, 21px line): field labels, chips, inline links, small buttons, secondary lines.
- **Caption** (600, 12px, 18px line): tags, tab labels, hints (hints at 400).

### Named Rules
**The Right Font For The Script Rule.** Text is always rendered through the `T` component, which picks the Noto family for the language on screen and aligns right in RTL. Official names (for example "UAE PASS") stay in Latin Noto Sans inside every language.

**The Three Weights Rule.** Only 400, 600 and 700 are loaded. Do not ask for 300, 500 or 800.

## Layout

A single column on every device. Screen content sits in a centred frame with a 640px maximum width, padded 16px, with 16px gaps between blocks and 48px of bottom room for scrolling past the tab bar. Spacing follows a 4px base: 4, 8, 16, 24, 32, 48.

Inside a card, content is a row: a 44px leading control or icon, then a flexible text column with 4px gaps. Rows mirror in RTL, and directional icons (arrows, chevrons, send) flip horizontally.

Every pressable element has a minimum 44px touch target, including inline text links (given 44px height). Tab items are 52px tall. Content never relies on a second column; on the web build the 640px frame simply centres.

## Elevation & Depth

The system is flat at rest. The shadow token exists but its opacity is 0, so depth comes from three tonal layers: the Paper ground, white Surface cards outlined with a 1px Rule border, and Sand fills for tracks and active states. The only true overlays are the bottom sheet (Paper, over the 45% ink `scrim` token) and the floating toast (solid Night).

One deliberate exception: the Ask NEXTORA voice card floats with a faint ambient shadow (Night at 6% opacity, 16px blur, 8px down) and a soft clay glow rising from its base, so the assistant reads as a distinct object rather than another list card.

### Named Rules
**The Flat Desk Rule.** Cards are separated by borders and spacing, never by drop shadows. Press feedback is a slight shrink (scale 0.985) and fade (opacity 0.92), not a lift.

## Shapes

Gently curved, never sharp and never bubbly. Buttons use 6px corners, chips, inputs, toasts and badges 10px, cards, the hero panel and sheet tops 12px, tags 4px. Fully round shapes are reserved for things that are naturally round or float: avatars, checklist check circles, icon wells, the language button and the tab-bar pill with its sliding drop. Borders are 1px Rule; selection borders on persona rows are 1.5px; the checklist circle is 2px.

## Components

### Buttons
Plain, confident, full-width in forms and stacked lists.
- **Shape:** gently curved (6px), minimum height 44px (36px for small), 10px × 16px padding, 600 label with an optional 17px leading icon.
- **Primary:** Harbour Ink with white text. Hover and press drop to 90% opacity.
- **Secondary:** Paper with a 1px Rule border and Night text; hover and press fill with Desert Clay Soft. This is the default for "go to" actions on home.
- **Light / Outline-light:** on the ink hero, a Sand button with Night text, and a transparent button with a 70% white border and white text.
- **Ghost:** text only, Harbour Ink (or Desert Clay On Dark on the hero).
- **Danger:** Danger red with white text.
- **Disabled:** Sand fill, Rule border, Disabled text; never just faded.
- **Focus (web):** a 2px ring in Desert Clay.

### Chips
- **Style:** white Surface, 1px Rule border, 10px corners, 40px tall, 14px side padding, Label type with an optional 16px muted icon.
- **State:** selected chips fill with Harbour Ink, white text, and a leading checkmark. They are checkboxes for assistive tech.

### Tags
Small status labels: 4px corners, 2px × 8px padding, Caption type. Tones: muted (Sand / Slate), clay (Desert Clay Soft / Desert Clay Text), ink (Harbour Ink Soft / Harbour Ink), warning and danger. Review status ("Human-reviewed", "Not yet reviewed", "Needs re-check") and the "DEMO · fictional sample data" marker use them.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** white Surface; a completed checklist card switches to Desert Clay Soft with a Desert Clay border.
- **Shadow Strategy:** none (see The Flat Desk Rule).
- **Border:** 1px Rule.
- **Internal Padding:** 16px, with 8px between children.

### Inputs / Fields
- **Style:** white Surface, 1px Rule border, 10px corners, 44px minimum height, 10px × 12px padding, 16px text in the script's Noto font, aligned to the reading direction.
- **Label and hint:** Label type above, Caption in Slate below.

### Navigation
- **Tab bar:** a floating pill (fully round, 6px inner padding) sitting on Paper above the safe area: 90% white with a Rule border. Six tabs, each a 20px outline Ionicon. Only the active tab shows its text label, so long translations never truncate.
- **Active state:** a Sand "drop" with a Rule border springs (friction 8, tension 90) under the selected tab. Active icons are Night, inactive Slate.
- **Dark variant:** on ink grounds the pill is translucent ink with a 25% white border, and the drop is 18% white.
- **Segmented control:** the same pill component, labels always visible.

### Checklist Item (signature)
The heart of the home screen. A card holding a 44px circular checkbox (2px Rule outline with the step number in Slate; filled Desert Clay Text with a white check when done), a 18px ink icon and 600 title, a Slate description, optional "official name" ink tag, action links and inline links in Harbour Ink. Done items strike through their title in Slate.

### Ink Hero Panel (signature)
Harbour Ink, 12px corners, 24px padding: greeting in Mist On Dark, headline in white, persona line, then a Desert Clay progress bar on a Sand track (8px tall, 4px corners, 300ms fill). The welcome screen extends this ink to the whole screen with the shape-only sunrise illustration (the sun rises 40px over 900ms, ease-out).

### Ask NEXTORA Voice Card (signature)
A 360px-wide white card with generous 24px corners, the one element allowed an ambient shadow (see Elevation & Depth). A 32px "NX" ink avatar, a divider, Harbour Ink Soft speech bubbles (18px corners with a 4px tail corner), and a round 48px mic button above a band of Desert Clay glow at 10–16% opacity.

### Bottom Sheet and Toast
Sheets slide up over a 45% ink scrim, Paper background, 12px top corners, 24px padding, max 85% height, title row with a 44px close button. Toasts float 24px above the bottom on Night, 10px corners, with a Desert Clay check, and dismiss after 2.4s.

## Do's and Don'ts

### Do:
- **Do** take every colour from `theme/index.ts` (and the matching gluestack variables) and refer to them by role.
- **Do** keep every pressable at least 44px in both directions, including text links.
- **Do** render all text through `T` so the right Noto family and reading direction apply, and flip directional icons in RTL.
- **Do** keep screens to one column inside the 640px frame, with one task or fact per card.
- **Do** show honesty states visually: review tags on content, an "AI-generated, may be wrong" label on assistant answers, and the Empty component (ink-soft icon well plus Slate text) instead of placeholder content.
- **Do** re-check contrast when you add a text pair, and keep `docs/CONTRAST.md` in step with the current palette.

### Don't:
- **Don't** add drop shadows to cards; depth is borders and tonal fills. The Ask NEXTORA voice card is the only exception.
- **Don't** use Desert Clay for primary actions, or Harbour Ink for completion.
- **Don't** use photography or people imagery; illustration stays shape-only.
- **Don't** add a second typeface; Noto Sans in each script is the only family.
- **Don't** hard-code colours in screens. Translucent fills are tokens too: `accentOnDarkSoft` (trust strip on ink), `glassOnDark` (dark tab pill) and `scrim` (behind sheets).
- **Don't** bring back the retired names `aubergine`, `purple`, `teal`, `navy` or `offWhite`. The palette is `ink`, `night`, `paper` and `clay`; tag tones and avatar hues are `ink` and `clay`.
- **Don't** design a dark theme from the gluestack `dark` variables; they are unused boilerplate. Dark appears only as the ink hero.
