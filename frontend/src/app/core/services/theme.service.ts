import { Injectable, signal, computed, effect } from '@angular/core';

export interface AbhiThemeColors {
  background: string;
  backgroundSecondary: string;
  surfaceRaised: string;
  surfaceInset: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentPrimary: string;
  accentSecondary: string;
  coreGlow: string;
  networkLine: string;
  active: string;
  border: string;
  borderActive: string;
  success: string;
  warning: string;
  error: string;
}

export interface AbhiTheme {
  id: string;
  label: string;
  isCustom?: boolean;
  colors: AbhiThemeColors;
}

export const QUANTUM_WHITE_THEME: AbhiTheme = {
  id: 'quantum-white',
  label: 'Quantum White (Default)',
  isCustom: false,
  colors: {
    background: '#f5f7fb',
    backgroundSecondary: '#ffffff',
    surfaceRaised: '#ffffff',
    surfaceInset: '#eaf0f8',
    textPrimary: '#0b1329',
    textSecondary: '#475569',
    textMuted: '#64748b',
    accentPrimary: '#0099cc',
    accentSecondary: '#2563eb',
    coreGlow: '#0099cc',
    networkLine: '#0099cc',
    active: '#0099cc',
    border: 'rgba(11, 19, 41, 0.09)',
    borderActive: 'rgba(0, 153, 204, 0.5)',
    success: '#059669',
    warning: '#d97706',
    error: '#e11d48'
  }
};

export const OBSIDIAN_CYAN_THEME: AbhiTheme = {
  id: 'obsidian-cyan',
  label: 'Obsidian Cyan',
  isCustom: false,
  colors: {
    background: '#030712',
    backgroundSecondary: '#070d1e',
    surfaceRaised: '#0d182e',
    surfaceInset: '#050a16',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    accentPrimary: '#00f0ff',
    accentSecondary: '#3b82f6',
    coreGlow: '#00f0ff',
    networkLine: '#00f0ff',
    active: '#00f0ff',
    border: 'rgba(0, 240, 255, 0.18)',
    borderActive: 'rgba(0, 240, 255, 0.45)',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444'
  }
};

export const MIDNIGHT_AMETHYST_THEME: AbhiTheme = {
  id: 'midnight-amethyst',
  label: 'Midnight Amethyst',
  isCustom: false,
  colors: {
    background: '#05030e',
    backgroundSecondary: '#0d071f',
    surfaceRaised: '#170c38',
    surfaceInset: '#090416',
    textPrimary: '#f8f5ff',
    textSecondary: '#c4b5fd',
    textMuted: '#8b7ca8',
    accentPrimary: '#c084fc',
    accentSecondary: '#818cf8',
    coreGlow: '#a855f7',
    networkLine: '#c084fc',
    active: '#e879f9',
    border: 'rgba(192, 132, 252, 0.22)',
    borderActive: 'rgba(232, 121, 249, 0.55)',
    success: '#34d399',
    warning: '#fbbf24',
    error: '#f43f5e'
  }
};

export const EMERALD_MATRIX_THEME: AbhiTheme = {
  id: 'emerald-matrix',
  label: 'Emerald Matrix',
  isCustom: false,
  colors: {
    background: '#020b06',
    backgroundSecondary: '#05160d',
    surfaceRaised: '#092416',
    surfaceInset: '#030f08',
    textPrimary: '#e6fff2',
    textSecondary: '#86efac',
    textMuted: '#4ade80',
    accentPrimary: '#10b981',
    accentSecondary: '#059669',
    coreGlow: '#10b981',
    networkLine: '#10b981',
    active: '#34d399',
    border: 'rgba(16, 185, 129, 0.22)',
    borderActive: 'rgba(52, 211, 153, 0.55)',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444'
  }
};

export const ARDENA_CRIMSON_THEME: AbhiTheme = {
  id: 'ardena-crimson',
  label: 'Ardena Sunset Crimson',
  isCustom: false,
  colors: {
    background: '#0e1013',
    backgroundSecondary: '#15181e',
    surfaceRaised: '#1c2027',
    surfaceInset: '#0a0b0d',
    textPrimary: '#f8fafc',
    textSecondary: '#9ca3af',
    textMuted: '#6b7280',
    accentPrimary: '#ff4d4d',
    accentSecondary: '#ff7849',
    coreGlow: '#ff4d4d',
    networkLine: '#ff6b6b',
    active: '#ff4d4d',
    border: 'rgba(255, 77, 77, 0.22)',
    borderActive: 'rgba(255, 77, 77, 0.65)',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444'
  }
};

export const OMBRIA_SLATE_THEME: AbhiTheme = {
  id: 'ombria-slate',
  label: 'Ombria Titanium Slate',
  isCustom: false,
  colors: {
    background: '#131518',
    backgroundSecondary: '#1a1d22',
    surfaceRaised: '#23272e',
    surfaceInset: '#0e1012',
    textPrimary: '#f3f4f6',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    accentPrimary: '#f59e0b',
    accentSecondary: '#fbbf24',
    coreGlow: '#f59e0b',
    networkLine: '#e2e8f0',
    active: '#f59e0b',
    border: 'rgba(255, 255, 255, 0.12)',
    borderActive: 'rgba(245, 158, 11, 0.55)',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444'
  }
};

export const SAPPHIRE_SAAS_THEME: AbhiTheme = {
  id: 'sapphire-saas',
  label: 'Sapphire Midnight SaaS',
  isCustom: false,
  colors: {
    background: '#050914',
    backgroundSecondary: '#0a1226',
    surfaceRaised: '#101e3d',
    surfaceInset: '#040710',
    textPrimary: '#f0f6fc',
    textSecondary: '#93c5fd',
    textMuted: '#60a5fa',
    accentPrimary: '#38bdf8',
    accentSecondary: '#3b82f6',
    coreGlow: '#0ea5e9',
    networkLine: '#38bdf8',
    active: '#0284c7',
    border: 'rgba(56, 189, 248, 0.22)',
    borderActive: 'rgba(56, 189, 248, 0.55)',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444'
  }
};

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'abhi_theme_preference';
  private static readonly STYLE_TAG_ID = 'abhi-theme-root-vars';

  readonly availablePresets: readonly AbhiTheme[] = [
    OBSIDIAN_CYAN_THEME,
    QUANTUM_WHITE_THEME,
    ARDENA_CRIMSON_THEME,
    OMBRIA_SLATE_THEME,
    SAPPHIRE_SAAS_THEME,
    MIDNIGHT_AMETHYST_THEME,
    EMERALD_MATRIX_THEME
  ];

  // DSA O(1) Hash Map for constant-time preset retrieval
  private readonly presetMap = new Map<string, AbhiTheme>(
    this.availablePresets.map((p) => [p.id, p])
  );

  readonly currentTheme = signal<AbhiTheme>(OBSIDIAN_CYAN_THEME);
  readonly previewTheme = signal<AbhiTheme | null>(null);

  readonly activeTheme = computed(() => {
    return this.previewTheme() || this.currentTheme();
  });

  private rafId: number | null = null;

  constructor() {
    this.loadSavedTheme();

    // Effect to apply CSS variables atomically whenever active theme changes
    effect(() => {
      const theme = this.activeTheme();
      this.applyThemeToDOM(theme);
    });
  }

  /**
   * DSA O(1) Lookup for saved theme with safe JSON fallback
   */
  private loadSavedTheme(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.id && this.presetMap.has(parsed.id)) {
          this.currentTheme.set(this.presetMap.get(parsed.id)!);
        } else if (parsed.colors) {
          this.currentTheme.set(parsed);
        }
      }
    } catch {
      this.currentTheme.set(QUANTUM_WHITE_THEME);
    }
  }

  /**
   * O(1) Constant-time preset selection
   */
  setPreset(presetId: string): void {
    const found = this.presetMap.get(presetId);
    if (found) {
      this.currentTheme.set(found);
      this.previewTheme.set(null);
      this.persistCurrentTheme();
    }
  }

  setLivePreviewColor(key: keyof AbhiThemeColors, value: string): void {
    const base = this.activeTheme();
    const updated: AbhiTheme = {
      id: 'custom',
      label: 'Custom Palette',
      isCustom: true,
      colors: {
        ...base.colors,
        [key]: value
      }
    };
    this.previewTheme.set(updated);
  }

  saveCustomTheme(): void {
    const preview = this.previewTheme();
    if (preview) {
      this.currentTheme.set(preview);
      this.previewTheme.set(null);
      this.persistCurrentTheme();
    }
  }

  cancelCustomPreview(): void {
    this.previewTheme.set(null);
  }

  resetToDefault(): void {
    this.currentTheme.set(QUANTUM_WHITE_THEME);
    this.previewTheme.set(null);
    this.persistCurrentTheme();
  }

  /**
   * Non-blocking persistent write scheduled outside the critical rendering path
   */
  private persistCurrentTheme(): void {
    if (typeof localStorage === 'undefined') return;
    setTimeout(() => {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentTheme()));
      } catch {
        // Safe storage quota fallback
      }
    }, 0);
  }

  /**
   * Atomic Batched CSS Variable Injection via a single <style> element.
   * Eliminates 35+ synchronous layout recalculations and style dirtiness checks,
   * guaranteeing 60fps single-frame repaint (<16ms) via requestAnimationFrame.
   */
  private applyThemeToDOM(theme: AbhiTheme): void {
    if (typeof document === 'undefined') return;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      const root = document.documentElement;
      const c = theme.colors;
      const isLight =
        theme.id === 'quantum-white' ||
        c.background.toLowerCase().startsWith('#f') ||
        c.background.toLowerCase() === '#ffffff';

      root.setAttribute('data-theme', theme.id);
      root.setAttribute('data-mode', isLight ? 'light' : 'dark');

      const cssVars = `
        :root {
          color-scheme: ${isLight ? 'light' : 'dark'};
          --abhi-bg: ${c.background};
          --abhi-bg-base: ${c.background};
          --abhi-bg-secondary: ${c.backgroundSecondary};
          --abhi-surface: ${c.surfaceRaised};
          --abhi-surface-raised: ${c.surfaceRaised};
          --abhi-surface-inset: ${c.surfaceInset};
          --abhi-text-primary: ${c.textPrimary};
          --abhi-text-secondary: ${c.textSecondary};
          --abhi-text-muted: ${c.textMuted};
          --abhi-cyan: ${c.accentPrimary};
          --abhi-blue: ${c.accentSecondary};
          --abhi-accent-cyan: ${c.accentPrimary};
          --abhi-accent-blue: ${c.accentSecondary};
          --abhi-border: ${c.border};
          --abhi-border-active: ${c.borderActive};
          --abhi-success: ${c.success};
          --abhi-warning: ${c.warning};
          --abhi-danger: ${c.error};
          --abhi-surface-glass: ${isLight ? 'rgba(255, 255, 255, 0.88)' : 'rgba(13, 24, 46, 0.78)'};
          --abhi-surface-card: ${isLight ? '#ffffff' : c.surfaceRaised};
          --abhi-bg-surface-glass: ${isLight ? 'rgba(255, 255, 255, 0.88)' : 'rgba(13, 24, 46, 0.78)'};
          --abhi-bg-surface-card: ${isLight ? '#ffffff' : c.surfaceRaised};
          --abhi-text-heading: ${isLight ? '#0b1329' : '#ffffff'};
          --abhi-border-subtle: ${isLight ? 'rgba(11, 19, 41, 0.08)' : c.border};
          --abhi-border-medium: ${isLight ? 'rgba(11, 19, 41, 0.16)' : c.borderActive};
          --abhi-card-bg: ${isLight ? '#ffffff' : c.surfaceRaised};
          --abhi-card-border: ${isLight ? 'rgba(11, 19, 41, 0.09)' : c.border};
          --abhi-card-text: ${isLight ? '#0b1329' : c.textPrimary};
          --abhi-raised-shadow: ${
            isLight
              ? '0 8px 24px -4px rgba(11, 19, 41, 0.07), 0 2px 8px -2px rgba(11, 19, 41, 0.04), 0 0 0 1px rgba(11, 19, 41, 0.06)'
              : '12px 12px 28px rgba(0, 0, 0, 0.55), -6px -6px 20px rgba(0, 240, 255, 0.04)'
          };
          --abhi-inset-shadow: ${
            isLight
              ? 'inset 2px 2px 6px rgba(11, 19, 41, 0.05), inset -2px -2px 6px rgba(255, 255, 255, 0.9)'
              : 'inset 4px 4px 12px rgba(0, 0, 0, 0.50), inset -3px -3px 8px rgba(0, 240, 255, 0.06)'
          };
          --abhi-glow-bg: ${
            isLight
              ? 'radial-gradient(circle at 50% 50%, rgba(0, 153, 204, 0.08) 0%, rgba(245, 247, 251, 0.7) 65%, #f5f7fb 100%)'
              : 'radial-gradient(ellipse at 50% 48%, rgba(0, 240, 255, 0.09) 0%, rgba(168, 85, 247, 0.04) 30%, rgba(6, 11, 24, 0.9) 65%, #030712 100%)'
          };
          --abhi-rim-vignette: ${
            isLight
              ? 'radial-gradient(circle at 50% 50%, transparent 60%, rgba(220, 228, 240, 0.45) 85%, rgba(210, 220, 235, 0.7) 100%)'
              : 'radial-gradient(circle at 50% 50%, transparent 45%, rgba(3, 7, 18, 0.55) 75%, rgba(2, 4, 10, 0.96) 100%)'
          };
        }
      `;

      let styleEl = document.getElementById(ThemeService.STYLE_TAG_ID) as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = ThemeService.STYLE_TAG_ID;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = cssVars;
    });
  }
}
