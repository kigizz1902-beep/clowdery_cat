---
name: Feline Explorer
colors:
  surface: '#fdf8f5'
  surface-dim: '#ded9d6'
  surface-bright: '#fdf8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f8f3f0'
  surface-container: '#f2edea'
  surface-container-high: '#ece7e4'
  surface-container-highest: '#e6e2df'
  on-surface: '#1c1b1a'
  on-surface-variant: '#544438'
  inverse-surface: '#32302e'
  inverse-on-surface: '#f5f0ed'
  outline: '#867366'
  outline-variant: '#d9c2b3'
  surface-tint: '#904d00'
  primary: '#904d00'
  on-primary: '#ffffff'
  primary-container: '#f2994a'
  on-primary-container: '#663500'
  inverse-primary: '#ffb77d'
  secondary: '#874f4c'
  on-secondary: '#ffffff'
  secondary-container: '#ffb7b2'
  on-secondary-container: '#7b4542'
  tertiary: '#545e76'
  on-tertiary: '#ffffff'
  tertiary-container: '#a3aec9'
  on-tertiary-container: '#374258'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdcc3'
  primary-fixed-dim: '#ffb77d'
  on-primary-fixed: '#2f1500'
  on-primary-fixed-variant: '#6e3900'
  secondary-fixed: '#ffdad7'
  secondary-fixed-dim: '#fcb4b0'
  on-secondary-fixed: '#360e0d'
  on-secondary-fixed-variant: '#6b3836'
  tertiary-fixed: '#d7e2ff'
  tertiary-fixed-dim: '#bbc6e2'
  on-tertiary-fixed: '#101b30'
  on-tertiary-fixed-variant: '#3c475d'
  background: '#fdf8f5'
  on-background: '#1c1b1a'
  surface-variant: '#e6e2df'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 20px
---

## Brand & Style
The brand personality centers on the "Playful Explorer Cat"—an identity that is inherently curious, nimble, and endearingly cozy. This design system bridges the gap between urban exploration and domestic comfort, targeting a community-driven audience that values local discovery through a whimsical lens.

The visual style is **Soft-Tactile**. It leverages organic shapes, gentle shadows, and a warm atmosphere to evoke the feeling of a sun-drenched windowsill. Key design motifs include subtle "ear" peaks on container headers and paw-print patterns for progress indicators. The emotional response is one of safety and delight, encouraging users to "prowl" through their neighborhoods with low stakes and high reward.

## Colors
The palette is inspired by the life of a neighborhood tabby. 

- **Primary (Tabby Orange):** Used for main actions, active states, and branding. It represents the energy of the explorer.
- **Secondary (Paw-pad Pink):** Used for highlights, decorative elements, and "soft" interactions. It provides the cozy, approachable counterpoint to the orange.
- **Tertiary (Street-night Navy):** The anchor for typography and deep backgrounds. It represents the mystery of the urban landscape at dusk.
- **Neutral (Cream Fur):** A warm off-white used for page backgrounds to reduce eye strain and maintain the "soft" aesthetic.

## Typography
The typography is friendly, rounded, and highly legible. 

**Plus Jakarta Sans** is used for headlines to provide a modern, bouncy energy. It features soft terminals that align with the "cat ear" motif. **Be Vietnam Pro** serves as the workhorse for body text and labels, offering a contemporary feel with excellent readability for map descriptions and user posts. Letter spacing is slightly tightened on headlines for a more "tucked-in" look and expanded on small labels to ensure clarity.

## Layout & Spacing
This design system utilizes a **Fluid Grid** model optimized for mobile-first interaction. 

The layout relies on a 4-column structure for mobile devices with a 20px outer margin to keep content away from the edges of curved screens. Spacing follows an 8px base unit rhythm, ensuring a consistent vertical cadence. Content blocks should use "Airy" padding (24px) to emphasize the cozy, non-cluttered nature of the brand. For tablet breakpoints, the margin increases to 40px and transitions to a 12-column grid to maintain readable line lengths.

## Elevation & Depth
Hierarchy is established through **Ambient Shadows** and **Tonal Layers**.

Surfaces do not use harsh black shadows. Instead, elevation is conveyed through soft, wide-dispersion shadows tinted with the Street-night Navy (at 5-10% opacity). This creates a "floating" effect, as if cards are sitting on a soft surface. 

- **Level 0 (Background):** Neutral Cream Fur.
- **Level 1 (Cards):** Pure White with a 1px soft border in Pink-pad Pink (20% opacity).
- **Level 2 (Modals/Active Pop-ups):** Deep shadow (24px blur) to pull the element toward the user.

## Shapes
The shape language is dominated by high-radius curves. 

Most containers use a **16px (rounded-lg)** radius. To further the "cat" theme, specific components like top-navigation bars or bottom sheets may feature "eared" corners—where the top left and top right corners have a slightly more pronounced, slightly pointed peak before the curve. Secondary elements like buttons and tags use fully rounded (pill-shaped) ends to maximize the friendly, approachable aesthetic.

## Components

- **Buttons:** Primary buttons are pill-shaped, using the Tabby Orange background. They feature a slight "squish" animation (scale 0.95) on press to mimic a physical paw-press.
- **Chips & Tags:** Small, rounded-md shapes using the Pink-pad Pink background with Navy text. Used for "territory" tags or "cat mood" indicators.
- **Cards:** White surfaces with 16px corners. The top of the card may feature a subtle notch or ear-inspired geometry. Use 24px internal padding.
- **Input Fields:** Soft-grey backgrounds with 12px rounded corners. The focus state replaces the border with a 2px Tabby Orange stroke and a tiny paw-print icon appearing at the end of the field.
- **Lists:** Clean rows separated by thin, Pink-pad Pink dividers. Every list item should have a circular leading icon or avatar.
- **Navigation:** A floating bottom bar with pill-shaped active indicators. The center "Explore" button is oversized and uses the Tabby Orange color.
- **Progress Bars:** Designed to look like a "yarn trail," with a small yarn ball icon acting as the progress head.