---
name: Juno
description: Dark, calm voice & video calling for gaming communities
colors:
  bg-base: "#0e0f14"
  bg-raised: "#14161e"
  bg-elevated: "#1c1f2b"
  bg-overlay: "#232638"
  bg-hover: "#2a2d3e"
  accent: "#6b7aee"
  accent-dim: "rgba(107,122,238,0.18)"
  accent-hover: "#8b97f2"
  accent-glow: "rgba(107,122,238,0.35)"
  green: "#3dd68c"
  green-dim: "rgba(61,214,140,0.15)"
  red: "#f04d4d"
  red-dim: "rgba(240,77,77,0.15)"
  yellow: "#f5c842"
  yellow-dim: "rgba(245,200,66,0.12)"
  blue: "#4d9fff"
  blue-dim: "rgba(77,159,255,0.15)"
  text-primary: "#f0f0f8"
  text-secondary: "#9b9db8"
  text-muted: "#5c5f7a"
  border: "rgba(255,255,255,0.07)"
  border-hover: "rgba(255,255,255,0.14)"
  border-focus: "rgba(107,122,238,0.6)"
typography:
  display:
    fontFamily: "'Space Mono', monospace"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  body:
    fontFamily: "'DM Sans', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'DM Sans', sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.08em"
    textTransform: "uppercase"
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
  xl: "20px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "36px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "7px 18px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-control:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
  button-control-active:
    backgroundColor: "{colors.accent-dim}"
    textColor: "{colors.accent}"
  button-control-danger:
    backgroundColor: "{colors.red-dim}"
    textColor: "{colors.red}"
  input:
    backgroundColor: "{colors.bg-elevated}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  toggle:
    backgroundColor: "{colors.bg-overlay}"
    rounded: "{rounded.pill}"
    size: "38px × 22px"
  toggle-active:
    backgroundColor: "{colors.accent-dim}"
    textColor: "{colors.accent}"
  card:
    backgroundColor: "{colors.bg-raised}"
    rounded: "{rounded.lg}"
    padding: "14px"
  chip:
    backgroundColor: "{colors.accent-dim}"
    textColor: "{colors.accent}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
---

# Design System: Juno

## 1. Overview

**Creative North Star: "The Night Studio"**

Juno is a dark space with points of light. The interface is the void — deep, quiet, receding. Accent colors are the signals: they draw attention to what matters (active channels, speaking indicators, control states) and vanish when they don't. The system rejects the corporate SaaS playbook entirely: no meeting schedulers, no enterprise blue-grays, no sterile professionalism. This is a room for gamers, not a conference tool.

The palette is built on near-black neutrals with cool undertones. The primary accent — a muted indigo — carries the brand identity but is used sparingly, at roughly 10% of any screen. Semantic colors (green for active, red for danger, yellow for caution) are functional, not decorative. The typography pairing of Space Mono (display) and DM Sans (body) creates a technical-but-approachable voice: monospace for identity and labels, humanist sans for readable body text.

**Key Characteristics:**
- Dark-first: the interface lives in darkness; light is earned through accent and state
- Functional color: every color has a job; no decorative fills or gradient backgrounds
- Monospace identity: the brand voice is typographic, not iconographic
- Flat at rest: depth comes from tonal layering (bg-base → bg-raised → bg-elevated), not shadows

## 2. Colors: The Void Palette

The palette is a cool-dark neutral ramp with a single muted indigo accent. Five neutral layers create depth through tonal stepping, not shadow.

### Primary
- **Muted Indigo** (#6b7aee): The brand accent. Used on active states, primary CTAs, focus rings, and the speaking indicator glow. Appears on ≤10% of any screen — its rarity is the point.

### Semantic
- **Signal Green** (#3dd68c): Online status, speaking indicators, successful connections. The "everything is working" color.
- **Alert Red** (#f04d4d): Muted mic, errors, leave-call button, destructive actions. Never used decoratively.
- **Caution Yellow** (#f5c842): Connecting states, warnings, idle status. Signals "attention needed" without urgency.
- **Info Blue** (#4d9fff): Network quality bars, informational badges. The quietest semantic color.

### Neutral
- **Void** (#0e0f14): The base background. The deepest layer of the interface.
- **Surface** (#14161e): Raised containers — sidebar, header, control bar. One step above void.
- **Panel** (#1c1f2b): Elevated elements — cards, input fields, active items. Two steps above void.
- **Overlay** (#232638): Hover states, tooltips, dropdowns. Three steps above void.
- **Hover** (#2a2d3e): Interactive feedback on hover. The brightest neutral.
- **Ink** (#f0f0f8): Primary text. High contrast against void.
- **Graphite** (#9b9db8): Secondary text. Readable but receded.
- **Slate** (#5c5f7a): Muted text, disabled states, section labels. The quietest text.

### Named Rules

**The One Accent Rule.** The primary accent (muted indigo) is used on ≤10% of any screen. Its rarity creates focus; overuse destroys it. If more than two elements on a screen are indigo, one of them is wrong.

**The Tonal Depth Rule.** Depth is conveyed through the five neutral layers (void → surface → panel → overlay → hover), never through drop shadows. The interface is a flat stack of planes.

**The Semantic Discipline Rule.** Green/red/yellow/blue are functional signals, not decorative fills. A green background means "online", not "this section is important." Never use semantic colors as section backgrounds or decorative accents.

## 3. Typography

**Display Font:** Space Mono (monospace)
**Body Font:** DM Sans (humanist sans-serif)

**Character:** Technical but warm. Space Mono carries the brand voice — it says "this is a tool built by people who care about craft." DM Sans handles everything readable — it's humanist enough to feel friendly, geometric enough to feel modern. The pairing creates contrast on the mono/sans axis, which is the only axis that works for a two-font system.

### Hierarchy
- **Display** (700, 36px, line-height 1.15, letter-spacing -0.02em): Hero headlines only. "talk loud, study together." Never used for section headings or body text.
- **Title** (600, 14px): Card titles, channel names, user names. The workhorse weight.
- **Body** (400, 14px, line-height 1.5): All readable text. Max line length 65–75ch where applicable.
- **Label** (700, 11px, uppercase, letter-spacing 0.08em): Section headers ("VOICE CHANNELS", "AUDIO", "THEME"). Always muted color, always uppercase.
- **Mono** (400, variable): Code-adjacent text — channel names prefixed with #, version numbers, technical readouts.

### Named Rules

**The Mono Identity Rule.** Space Mono is the brand voice, not the body voice. It appears in the server name, hero headline, modal titles, and channel names. Never set a paragraph in monospace.

**The Label Restraint Rule.** Uppercase labels are used for section navigation only (sidebar sections, settings groups). Never use them for emphasis, callouts, or inline annotations.

## 4. Elevation

The system is flat by default. Depth is conveyed entirely through the neutral tonal ramp (void → surface → panel → overlay → hover), not through shadows or blur.

The only shadow in the system is the settings modal drop shadow (`0 24px 80px rgba(0,0,0,0.6)`) — a structural shadow that separates the modal from the backdrop. It is not a design token; it is a one-off for modal depth.

Active states use border color shifts (accent glow) rather than elevation changes. A selected channel doesn't lift — it glows.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. The only depth signal is the neutral tonal ramp. Shadows are prohibited except for modal overlays.

**The Glow-Not-Lift Rule.** Interactive feedback uses border-color and box-shadow (accent glow), never translateY or scale transforms on containers. Buttons may scale on `:active` (0.96) as tactile feedback, but cards and panels stay flat.

## 5. Components

### Buttons
- **Shape:** Pill radius (999px) for primary actions; medium radius (10px) for control buttons
- **Primary:** Muted indigo background (#6b7aee), white text, pill shape, 7px 18px padding. Box-shadow glow on hover.
- **Control:** Transparent background, secondary text color. Active state: indigo-dim background with accent text and subtle glow border.
- **Danger:** Red-dim background, red text. Used for leave-call and mute-off states. Hover fills to solid red with white text.
- **Ghost/Icon:** 28–36px square, transparent, secondary text. Hover: elevated background.

### Inputs / Fields
- **Style:** Elevated background (#1c1f2b), 1px border (rgba white 0.07), medium radius (10px), 8px 12px padding
- **Focus:** Border shifts to accent with a 3px accent-dim glow ring
- **Placeholder:** Muted text color (#5c5f7a)

### Toggles
- **Style:** Pill-shaped track (38×22px), overlay background, 14px circular thumb
- **Active:** Accent-dim track background, accent-colored thumb with subtle glow
- **Transition:** 120ms ease for track, 220ms ease for thumb position

### Cards / Containers
- **Corner Style:** Large radius (14px)
- **Background:** Raised (#14161e) for feature cards; elevated (#1c1f2b) for interactive rows
- **Border:** 1px solid rgba white 0.07; hover shifts to 0.14
- **Internal Padding:** 14px for cards, 12px 16px for rows
- **No shadows.** Depth comes from the background layer, not elevation.

### Video Tiles
- **Shape:** Large radius (14px), overflow hidden
- **Background:** Raised surface when no video; black when video is active
- **Speaking Indicator:** Green border (2px) with green-dim outer glow ring, pulsing animation
- **Overlay:** Bottom-aligned gradient (black 55% → transparent 45%) for name/mute badge

### Navigation (Sidebar)
- **Width:** 220px fixed
- **Background:** Raised (#14161e), right border
- **Active Channel:** Accent-dim background with a 3px left accent stripe
- **User Bar:** Base background, top border, avatar with status dot

### Settings Modal
- **Shell:** 720px wide, raised background, extra-large radius (20px), heavy drop shadow
- **Nav:** 160px left column, accent-dim for active tab
- **Backdrop:** 65% black with 4px blur

## 6. Do's and Don'ts

### Do:
- **Do** use the five neutral layers for depth. Every surface should be one of: void, surface, panel, overlay, hover.
- **Do** keep the accent at ≤10% of any screen. Its restraint is the brand.
- **Do** use semantic colors only for their functional purpose (green = online/active, red = error/danger, yellow = warning, blue = info).
- **Do** use Space Mono for brand identity elements (server name, hero, modal titles) and DM Sans for everything readable.
- **Do** use pill radius (999px) for primary CTAs and badges; medium radius (10px) for containers and inputs.
- **Do** animate state changes with the existing transition tokens: fast (120ms), mid (220ms), slow (380ms cubic-bezier 0.16,1,0.3,1).
- **Do** support reduced motion with crossfade or instant alternatives for all animations.

### Don't:
- **Don't** use drop shadows for depth. The system is flat; depth is tonal.
- **Don't** use the accent color as a background fill. It's a signal, not a surface.
- **Don't** use semantic colors decoratively. No green section backgrounds, no red callout boxes.
- **Don't** set paragraphs in Space Mono. It's a brand voice, not a body font.
- **Don't** use uppercase labels outside of section navigation. No emphasis callouts, no inline annotations.
- **Don't** add gradient backgrounds, glassmorphism, or blur effects to cards or containers.
- **Don't** use corporate SaaS patterns: no meeting schedulers, no enterprise blue-grays, no sterile professional interfaces.
- **Don't** use side-stripe borders (border-left > 1px as a colored accent). Use full borders, background tints, or nothing.
- **Don't** use gradient text (background-clip: text). Single solid colors only.
- **Don't** use the hero-metric template (big number, small label, supporting stats). It's a SaaS cliché.
