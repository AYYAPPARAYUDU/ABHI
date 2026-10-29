---
name: figma-to-code
description: >-
  Design-to-code bridge for converting Figma designs, screenshots, or design
  specs into production Angular + Three.js components. Use when the user provides
  a design image, Figma URL, or describes a UI layout they want implemented.
  Follows ABHI's dark neumorphic design system.
---

# Figma-to-Code — Design Implementation Skill

## Overview
Converts visual designs (screenshots, mockups, Figma exports, or verbal
descriptions) into production-ready Angular components that follow ABHI's
dark neumorphic design system with Three.js integration.

## When to Activate
- User shares a design image or screenshot
- User describes a UI layout they want built
- User references a Figma file or design spec
- User wants a component styled in ABHI's design language

## Design-to-Code Protocol

### Phase 1: Analyze the Design
1. Identify all visual elements (cards, buttons, inputs, charts, 3D areas)
2. Map the layout grid (rows, columns, spacing)
3. Note colors, typography, shadows, and effects
4. Identify interactive elements and their states (hover, active, disabled)
5. Flag any 3D/WebGL regions that need Three.js

### Phase 2: Map to ABHI Design System

#### Color Palette
| Token | Obsidian Cyan | Midnight Amethyst |
|---|---|---|
| `--bg-primary` | `#0a0a0f` | `#0a0a12` |
| `--bg-surface` | `#12121a` | `#121218` |
| `--bg-elevated` | `#1a1a25` | `#1a1a22` |
| `--accent` | `#00f0ff` (cyan) | `#a855f7` (amethyst) |
| `--accent-glow` | `rgba(0,240,255,0.3)` | `rgba(168,85,247,0.3)` |
| `--text-primary` | `#e0e0e8` | `#e0e0e8` |
| `--text-secondary` | `#888898` | `#888895` |
| `--border` | `rgba(255,255,255,0.06)` | `rgba(255,255,255,0.06)` |

#### Neumorphic Shadows
```css
/* Raised surface */
.neuro-raised {
  box-shadow:
    6px 6px 12px rgba(0, 0, 0, 0.5),
    -3px -3px 8px rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
}

/* Inset / pressed */
.neuro-inset {
  box-shadow:
    inset 4px 4px 8px rgba(0, 0, 0, 0.5),
    inset -2px -2px 6px rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 12px;
}

/* Accent glow */
.neuro-glow {
  box-shadow:
    0 0 20px var(--accent-glow),
    6px 6px 12px rgba(0, 0, 0, 0.5);
}
```

#### Typography
```css
/* Headings */
font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
/* Mono/Code */
font-family: 'JetBrains Mono', 'Cascadia Code', monospace;
/* Body sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.25rem;    /* 20px */
--text-xl: 1.5rem;     /* 24px */
--text-2xl: 2rem;      /* 32px */
```

### Phase 3: Generate Angular Component

Create a standalone Angular component with:
```
component-name/
  ├── component-name.component.ts      # Logic + template (inline)
  ├── component-name.component.scss    # Neumorphic styles
  └── component-name.component.spec.ts # Basic tests
```

### Phase 4: Verify
1. Build: `npm run build` — zero errors
2. Visual check in browser at `http://127.0.0.1:4200/`
3. Compare against original design
4. Check both themes (Obsidian Cyan + Midnight Amethyst)
5. Verify responsive behavior

## Component Patterns

### Card Component
```typescript
@Component({
  selector: 'app-neuro-card',
  standalone: true,
  template: `
    <div class="neuro-card" [class.glow]="glow()">
      <ng-content />
    </div>
  `,
  styles: [`
    .neuro-card {
      background: var(--bg-surface);
      box-shadow: 6px 6px 12px rgba(0,0,0,0.5),
                  -3px -3px 8px rgba(255,255,255,0.03);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      transition: all 0.3s ease;
    }
    .neuro-card.glow {
      box-shadow: 0 0 20px var(--accent-glow),
                  6px 6px 12px rgba(0,0,0,0.5);
    }
  `]
})
export class NeuroCardComponent {
  glow = input(false);
}
```

### 3D Canvas Region
When the design includes a 3D viewport area, integrate with
`ThreeSceneManagerService` and use a `<canvas>` element managed by Three.js.

## Rules
1. **Always use CSS custom properties** — Never hardcode colors
2. **Always standalone components** — No NgModules
3. **Always use Angular signals** — Not BehaviorSubject for component state
4. **Always support both themes** — Test Obsidian Cyan and Midnight Amethyst
5. **Always clean up Three.js resources** — Dispose in ngOnDestroy

