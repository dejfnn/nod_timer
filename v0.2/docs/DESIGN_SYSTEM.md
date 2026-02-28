# TimeFlow Design System — "Obsidian Chronograph"

## Aesthetic Direction
Luxury dark interface inspired by high-end chronograph watch faces meeting
Linear/Raycast sleekness. Deep inky navy creates depth, not just darkness.
Teal accent is the "luminous" color — like lume on a watch dial. Every surface
has subtle layering. The timer IS the product — it should feel like gazing
at a precision instrument.

## Color Philosophy
- **Surfaces layer**: deep → card → elevated → hover (never flat)
- **Teal (#00d4aa)**: luminous accent — used for active states, the running timer glow, success
- **Blue (#4A90D9)**: primary interactive — buttons, links, selected states
- **Gradients**: always subtle, reinforcing depth (never decorative rainbow)
- **Borders**: never solid white — always translucent (rgba white at 6-12%)

## Typography Rules
- System font stack (SF Pro on iOS, Roboto on Android) — clean, not decorative
- Timer digits: monospace, 56px, tabular-nums, letter-spacing 4px — the hero moment
- Section headers: 13px, uppercase, letter-spacing 1.5px, muted color — Linear-style
- Body: 15px regular, secondary color for descriptions
- Values/metrics: semibold, primary color, tabular-nums for alignment

## Spacing System
- Base unit: 4px
- Component padding: 16px (cards), 12px (badges), 20px (sections)
- Between cards: 12px
- Section gaps: 24px
- Screen horizontal padding: 20px

## Motion Principles
- Press states: scale(0.97) with 150ms spring
- Card hover/press: subtle lift via opacity change (not transform on mobile)
- Timer pulse: 2s infinite, gentle box-shadow expansion
- Page transitions: 200ms fade
- List items: staggered fadeIn on mount (50ms delay per item)
- NEVER bounce or overshoot — always refined, dampened motion
