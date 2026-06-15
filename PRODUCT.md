# Product

## Register

product

## Users

Gamers and online communities who need voice/video calling for their squads. They're in a relaxed, social context — hanging out, coordinating in-game, or just vibing. They expect instant responsiveness, low latency, and a UI that stays out of their way. Familiar with Discord-style layouts but looking for something lighter and calmer.

## Product Purpose

Juno is a lightweight voice & video calling app for gaming communities. It provides channel-based voice/video rooms with screen sharing, virtual backgrounds, and per-device audio controls — powered by Agora RTC for sub-100ms latency. Success looks like a squad being able to jump into a call instantly without friction, distractions, or bloat.

## Brand Personality

Clean, minimal, calm. The interface should feel like a quiet room — focused, unhurried, confident. Not loud or aggressive. Think of the difference between a cluttered gaming overlay and a well-organized desk. Voice is understated but capable; it doesn't shout, it shows.

## Anti-references

- **Corporate/SaaS feel**: Avoid Slack, Microsoft Teams, Zoom-style professional interfaces. No meeting scheduling UI, no enterprise onboarding flows, no sterile blue-gray palettes.
- **Cluttered gaming UI**: Avoid old Discord's dense sidebar noise, Twitch's ad-heavy panels, or any interface that feels like it's competing for attention.

## Design Principles

1. **Instant access**: Jump into a call in one click. No setup wizards, no confirmations, no friction between wanting to talk and talking.
2. **Calm presence**: The UI should recede when you're in a call. Controls are there when you need them, invisible when you don't.
3. **Show, don't tell**: Network quality, speaking indicators, and connection status are visual, not textual. The interface communicates through color and motion, not labels.
4. **Earned density**: Information density is high where it matters (channel list, audio controls) and low where it doesn't (hero, settings). Every pixel has a job.

## Accessibility & Inclusion

- Reduced motion support via `prefers-reduced-motion` — all animations have crossfade/instant alternatives
- Keyboard navigable channel list and call controls
- Color is never the only indicator — status dots pair with text labels
- Sufficient contrast on dark theme (target WCAG AA for body text)
