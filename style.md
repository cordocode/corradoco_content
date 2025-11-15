# Corrado & Co. Website Style Guide

## Brand Overview
A clean, minimal design aesthetic focused on clarity and professionalism with subtle visual interest. The design balances modern automation/tech themes with approachable warmth.

---

## Color Palette

### Primary Colors
- **Cream Background**: `#ffffe2` - Main background color throughout site
- **Charcoal Text**: `#1a1a1a` - Primary text and strong UI elements

### Interactive States
- **Hover**: Elements typically transform with `translateY(-2px to -4px)` and add subtle shadows
- **Active**: Buttons use background/color inversions (cream ↔ charcoal)
- **Visited**: Copper/bronze (`#d4a574`) for timeline progress indicators

---

## Typography

### Font CDN Link (Required)
```html
<!-- Add to <head> of HTML -->
<link href="https://api.fontshare.com/v2/css?f[]=khand@400&f[]=array@400&display=swap" rel="stylesheet">
```

### Font Families
```css
/* Headings - All titles, numbers, large text */
font-family: 'Khand', sans-serif;
font-weight: 300 | 400; /* Light for body, Regular for headings */

/* Body Text - All descriptions, UI elements */
font-family: 'Array', sans-serif;
font-weight: 400; /* Regular only */
```

### Font Scale

#### Display/Hero Level
- **Hero Headlines**: 64px, Khand 400, line-height 1.1
- **Section Titles**: 48px, Khand 400, line-height 1.2
- **Large Headers**: 42px, Khand 400, line-height 1.2

#### Content Level
- **Card Titles**: 28-32px, Khand 400, line-height 1.2
- **Subsection Headers**: 24px, Khand 400
- **Body Large**: 18-20px, Array 400 or Khand 300, line-height 1.6-1.7
- **Body Standard**: 16-17px, Array 400, line-height 1.5-1.7
- **Body Small**: 14-15px, Array 400, line-height 1.4-1.6
- **Captions/Labels**: 12-13px, Array 400, uppercase, letter-spacing 0.02-0.08em

### Typography Guidelines
- Letter spacing: `0.02em` for most headings
- Uppercase text reserved for: CTAs, labels, navigation
- Line heights: Tight (1.1-1.2) for headings, comfortable (1.5-1.8) for body

---

## Spacing System

### Padding Scale
- **XS**: 8-12px - Tight spacing, inline elements
- **SM**: 16-20px - Standard element padding
- **MD**: 24-32px - Card interiors, content blocks
- **LG**: 40-60px - Section padding (vertical)
- **XL**: 80px - Major section separation

### Margins
- **Component Gap**: 16-24px
- **Section Gap**: 40-60px
- **Content Bottom**: 20-24px between paragraphs
- **Title Bottom**: 8-16px below headers

---

## Layout Patterns

### Max Widths
- **Narrow Content**: 700-800px (single-column text, CTAs)
- **Standard Content**: 900-1000px (general sections)
- **Wide Content**: 1100-1200px (grids, multi-column)
- **Full Width**: 1400px (hero sections, carousels)

### Grid Systems
```css
/* Standard Card Grid */
grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
gap: 20-32px;

/* Three-Column Grid */
grid-template-columns: repeat(3, 1fr);
gap: 20px;

/* Two-Column Grid */
grid-template-columns: repeat(2, 1fr);
gap: 60px;
```

### Centering Pattern
```css
max-width: [value]px;
margin: 0 auto;
padding: 0 20px; /* Mobile safety */
```

---

## Component Styles

### Buttons

#### Primary CTA
```css
padding: 12-14px 28-32px;
background-color: #1a1a1a;
color: #ffffe2;
border: 2px solid #1a1a1a;
font-family: 'Array', sans-serif;
font-size: 14px;
text-transform: uppercase;
letter-spacing: 0.02em;
transition: all 0.3s ease;

/* Hover */
background-color: transparent;
color: #1a1a1a;
transform: translateY(-2px);
```

#### Secondary/Ghost Button
```css
background-color: transparent;
color: #1a1a1a;
border: 1px solid #1a1a1a;

/* Hover */
background-color: #1a1a1a;
color: #ffffe2;
```

### Cards
```css
border: 1px solid #1a1a1a;
background-color: #ffffe2;
padding: 32px;
transition: all 0.3s ease;

/* Hover */
transform: translateY(-4px);
box-shadow: 0 6-8px 20-24px rgba(26, 26, 26, 0.1-0.15);
```

### Input Fields
```css
padding: 10-12px 16px;
border: 1px solid #1a1a1a or #8a8a8a;
background-color: rgba(255, 255, 255, 0.3-0.5);
font-family: 'Array', sans-serif;
font-size: 14-16px;
color: #1a1a1a;

/* Focus */
border-color: #1a1a1a;
outline: none;
```

### Timeline Nodes
```css
/* Node Circle */
width: 50-70px;
height: 50-70px;
border: 2px solid #1a1a1a;
border-radius: 50%;
background-color: #ffffe2;

/* Number Inside */
font-family: 'Khand', sans-serif;
font-size: 18-24px;
color: #1a1a1a;

/* Expanded State */
background-color: #1a1a1a;
color: #ffffe2;
transform: scale(1.1);

/* Visited State */
border-color: #d4a574;
color: #d4a574;
```

---

## Animation & Transitions

### Standard Timing
```css
transition: all 0.3s ease;
```

### Smooth Expansion
```css
transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
```

### Common Animations
- **Hover Lift**: `transform: translateY(-2px to -4px)`
- **Hover Horizontal**: `transform: translateX(4px)`
- **Scale**: `transform: scale(1.02-1.1)`
- **Fade In**: `opacity: 0 → 1` over 0.4-0.6s

### Keyframe Examples
```css
@keyframes fadeInResult {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## Background Effects

### Vanta.js Integration
Used for subtle animated backgrounds:
- **BIRDS**: Hero sections (light, organic movement)
- **NET**: Timeline/process sections (grows with user interaction)

Settings Pattern:
```javascript
{
  backgroundColor: 0xffffe2,
  color: 0x1a1a1a,
  mouseControls: true,
  touchControls: true,
  gyroControls: false,
  scale: 1.0,
  opacity: 0.5-0.8
}
```

### Overlays
- Semi-transparent cream: `rgba(255, 255, 226, 0.7-0.8)`
- Dark overlay: `rgba(26, 26, 26, 0.8)`

---

## Responsive Breakpoints

```css
/* Desktop First Approach */

@media (max-width: 1024px) {
  /* Tablet landscape */
}

@media (max-width: 968px) {
  /* Tablet portrait */
  /* Grid: 3-col → 2-col */
}

@media (max-width: 768px) {
  /* Mobile landscape / Large phone */
  /* Grid: 2-col → 1-col */
  /* Reduce font sizes by ~15-25% */
  /* Reduce padding by ~20-30% */
}

@media (max-width: 640px) {
  /* Standard phone */
}

@media (max-width: 480px) {
  /* Small phone */
  /* Further reduce fonts and spacing */
}
```

### Responsive Font Scaling
- **Hero**: 64px → 42px → 36px
- **Section Titles**: 48px → 36px → 32px
- **Body**: 18px → 16px → 15px
- **Small**: 14px → 13px → 12px

---

## Border & Shadow System

### Borders
- **Standard**: `1px solid #1a1a1a` - Most UI elements
- **Heavy**: `2px solid #1a1a1a` - Important buttons, active states
- **Light**: `1px solid #d4d4d4` - Subtle dividers
- **Accent**: `2px solid #d4a574` - Highlights, left borders on quotes

### Shadows
```css
/* Subtle Hover */
box-shadow: 0 4px 12px rgba(26, 26, 26, 0.15);

/* Card Hover */
box-shadow: 0 6px 20px rgba(26, 26, 26, 0.1);

/* Elevated */
box-shadow: 0 8px 24px rgba(26, 26, 26, 0.15);

/* Dark Context */
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
```

### Border Radius
- **Buttons/Inputs**: `0` (square)
- **Cards**: `0` (square) or `8-16px` (minimal rounding when needed)
- **Circular**: `50%` (timeline nodes, icon buttons)

---

## Content Formatting

### Lists
```css
/* Bullet Points */
list-style: none;
padding-left: 20px;
position: relative;

li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: #1a1a1a;
  font-weight: bold;
}

/* Spacing */
margin-bottom: 12px;
line-height: 1.6-1.8;
```

### Blockquotes
```css
border-left: 3px solid #1a1a1a;
padding-left: 24px;
margin: 32px 0;
font-style: italic;
color: #4a4a4a;
```

### Markdown Styling
- **H2**: 36px Khand, 48px top margin, 24px bottom
- **H3**: 28px Khand, 36px top margin, 20px bottom
- **Strong**: font-weight 600
- **Links**: Color #1a1a1a, underline, hover opacity 0.7

---

## Voice & Tone

### Writing Style
- **Direct and clear** - No jargon unless necessary
- **Conversational but professional** - "We" not "Our team of experts"
- **Benefit-focused** - Lead with what the user gets
- **Specific over vague** - Real examples, actual numbers

### Copy Patterns
- **Headlines**: Question or benefit statement (5-8 words)
- **Subheads**: Supporting detail or elaboration (10-15 words)
- **Body**: Shorter paragraphs (2-4 sentences)
- **CTAs**: Action verb + clear outcome ("Book Your Free Audit")

---

## Design Principles

### 1. Minimal But Not Sterile
- Use generous whitespace
- One visual effect per section (either animation OR complex grid, not both)
- Cream background prevents stark white harshness

### 2. Subtle Interaction
- Animations exist but don't dominate
- Hover states provide feedback without being loud
- Interactive elements clearly signal their purpose

### 3. Progressive Disclosure
- Start simple, reveal complexity on interaction
- Expandable timelines and accordions over walls of text
- Lead with outcome, provide detail on demand

### 4. Consistent Hierarchy
- One H1 per page
- Clear visual weight differences between levels
- Spacing reinforces importance

### 5. Mobile-First Thinking
- Single column layouts work on all devices
- Touch targets minimum 40x40px
- Test readability at small sizes first

---

## File Organization

### CSS Structure
```
Component.css
├── Component-specific styles
├── Admin/special states
├── Responsive breakpoints (@media queries at end)
└── Animations (keyframes at end)
```

### Naming Conventions
- **BEM-adjacent**: `.component-element-modifier`
- **Descriptive**: `.blog-card-title` not `.bct`
- **State classes**: `.expanded`, `.visited`, `.active`

---

## Special Components

### Sliders (Interactive)
- Inline with text
- Minimal chrome
- Values update in real-time
- Cream on charcoal backgrounds

### Chat Interface
- Grey text that turns cream on hover
- Input fields with subtle backgrounds
- Send button with pulse animation
- Typing indicators with slide-in animation

### Carousels
- Continuous loop animation
- Pause on hover
- Fade overlays on edges (150px gradient)
- Logo opacity 0.7 → 1.0 on hover

---

## Accessibility Notes

- Color contrast exceeds WCAG AA standards
- Focus states visible (border change)
- Interactive elements have clear hover/active states
- Font sizes remain readable at all breakpoints
- Touch targets appropriately sized for mobile

---

## Quick Reference

### Most Common Color Combinations
1. **Primary**: Charcoal (#1a1a1a) on Cream (#ffffe2)
2. **Reversed**: Cream (#ffffe2) on Charcoal (#1a1a1a)
3. **Subtle**: Medium Grey (#4a4a4a) on Cream (#ffffe2)
4. **Muted**: Light Grey (#6a6a6a) on Cream (#ffffe2)
5. **Accent**: Copper (#d4a574) highlights

### Most Used Spacing Values
- 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 60px, 80px

### Most Common Font Sizes
- 12px, 13px, 14px, 16px, 18px, 20px, 24px, 28px, 32px, 36px, 42px, 48px, 64px

---

## Technical Implementation Notes

- React-based SPA architecture
- Vanta.js for background effects (loaded via CDN)
- Supabase for backend/database
- ReactMarkdown for blog content rendering
- CSS Modules or standard CSS (not CSS-in-JS)
- Mobile-first or desktop-first (both present in codebase)

---

*Last Updated: Based on Corrado & Co. website v1.0*