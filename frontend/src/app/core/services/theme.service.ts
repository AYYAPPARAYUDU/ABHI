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
    background: '#050811',
    backgroundSecondary: '#080e19',
    surfaceRaised: '#0e1828',
    surfaceInset: '#080e18',
    textPrimary: '#eef5ff',
    textSecondary: '#a7b7cc',
    textMuted: '#8193ac',
    accentPrimary: '#38d9ff',
    accentSecondary: '#397bff',
    coreGlow: '#06b6d4',
    networkLine: '#38d9ff',
    active: '#38d9ff',
    border: 'rgba(151, 185, 230, 0.13)',
    borderActive: 'rgba(56, 217, 255, 0.42)',
    success: '#48dda2',
    warning: '#ffca70',
    error: '#ff5b71'
  }
};

export const MIDNIGHT_AMETHYST_THEME: AbhiTheme = {
  id: 'midnight-amethyst',
  label: 'Midnight Amethyst',
  isCustom: false,
  colors: {
    background: '#090514',
    backgroundSecondary: '#110924',
    surfaceRaised: '#190d33',
    surfaceInset: '#0d071a',
    textPrimary: '#f8f5ff',
    textSecondary: '#c4b5fd',
    textMuted: '#8b7ca8',
    accentPrimary: '#c084fc',
    accentSecondary: '#818cf8',
    coreGlow: '#a855f7',
    networkLine: '#c084fc',
    active: '#e879f9',
    border: 'rgba(192, 132, 252, 0.18)',
    borderActive: 'rgba(232, 121, 249, 0.5)',
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
    background: '#04110b',
    backgroundSecondary: '#06170f',
    surfaceRaised: '#0b261a',
    surfaceInset: '#05140d',
    textPrimary: '#e6fff2',
    textSecondary: '#86efac',
    textMuted: '#4ade80',
    accentPrimary: '#10b981',
    accentSecondary: '#059669',
    coreGlow: '#10b981',
    networkLine: '#10b981',
    active: '#34d399',
    border: 'rgba(16, 185, 129, 0.2)',
    borderActive: 'rgba(52, 211, 153, 0.55)',
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

  readonly availablePresets: AbhiTheme[] = [
    QUANTUM_WHITE_THEME,
    OBSIDIAN_CYAN_THEME,
    MIDNIGHT_AMETHYST_THEME,
    EMERALD_MATRIX_THEME
  ];

  readonly currentTheme = signal<AbhiTheme>(QUANTUM_WHITE_THEME);
  readonly previewTheme = signal<AbhiTheme | null>(null);

  readonly activeTheme = computed(() => {
    return this.previewTheme() || this.currentTheme();
  });

  constructor() {
    this.loadSavedTheme();

    // Effect to apply CSS variables dynamically whenever active theme changes
    effect(() => {
      const theme = this.activeTheme();
      this.applyThemeToDOM(theme);
    });
  }

  private loadSavedTheme(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.id === 'quantum-white') {
          this.currentTheme.set(QUANTUM_WHITE_THEME);
        } else if (parsed.id === 'obsidian-cyan') {
          this.currentTheme.set(OBSIDIAN_CYAN_THEME);
        } else if (parsed.id === 'midnight-amethyst') {
          this.currentTheme.set(MIDNIGHT_AMETHYST_THEME);
        } else if (parsed.id === 'emerald-matrix') {
          this.currentTheme.set(EMERALD_MATRIX_THEME);
        } else if (parsed.colors) {
          this.currentTheme.set(parsed);
        }
      }
    } catch {
      this.currentTheme.set(QUANTUM_WHITE_THEME);
    }
  }

  setPreset(presetId: string): void {
    const found = this.availablePresets.find((p) => p.id === presetId);
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

  private persistCurrentTheme(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentTheme()));
    } catch {
      // Fallback
    }
  }

  private applyThemeToDOM(theme: AbhiTheme): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const c = theme.colors;
    const isLight = theme.id === 'quantum-white' || c.background.toLowerCase().startsWith('#f') || c.background.toLowerCase() === '#ffffff';

    root.style.setProperty('color-scheme', isLight ? 'light' : 'dark');
    root.setAttribute('data-theme', theme.id);
    root.setAttribute('data-mode', isLight ? 'light' : 'dark');

    root.style.setProperty('--abhi-bg', c.background);
    root.style.setProperty('--abhi-bg-base', c.background);
    root.style.setProperty('--abhi-bg-secondary', c.backgroundSecondary);
    root.style.setProperty('--abhi-surface', c.surfaceRaised);
    root.style.setProperty('--abhi-surface-raised', c.surfaceRaised);
    root.style.setProperty('--abhi-surface-inset', c.surfaceInset);
    root.style.setProperty('--abhi-text-primary', c.textPrimary);
    root.style.setProperty('--abhi-text-secondary', c.textSecondary);
    root.style.setProperty('--abhi-text-muted', c.textMuted);
    root.style.setProperty('--abhi-cyan', c.accentPrimary);
    root.style.setProperty('--abhi-blue', c.accentSecondary);
    root.style.setProperty('--abhi-accent-cyan', c.accentPrimary);
    root.style.setProperty('--abhi-accent-blue', c.accentSecondary);
    root.style.setProperty('--abhi-border', c.border);
    root.style.setProperty('--abhi-border-active', c.borderActive);
    root.style.setProperty('--abhi-success', c.success);
    root.style.setProperty('--abhi-warning', c.warning);
    root.style.setProperty('--abhi-danger', c.error);

    if (isLight) {
      root.style.setProperty('--abhi-raised-shadow', '0 10px 25px -4px rgba(11, 19, 41, 0.07), 0 4px 10px -2px rgba(11, 19, 41, 0.04), 0 0 0 1px rgba(11, 19, 41, 0.06)');
      root.style.setProperty('--abhi-inset-shadow', 'inset 2px 2px 6px rgba(11, 19, 41, 0.06), inset -2px -2px 6px rgba(255, 255, 255, 0.85)');
      root.style.setProperty('--abhi-glow-bg', 'radial-gradient(circle at 50% 50%, rgba(0, 153, 204, 0.12) 0%, rgba(245, 247, 251, 0.65) 65%, #f5f7fb 100%)');
      root.style.setProperty('--abhi-rim-vignette', 'radial-gradient(circle at 50% 50%, transparent 60%, rgba(220, 228, 240, 0.45) 85%, rgba(210, 220, 235, 0.7) 100%)');
    } else {
      root.style.setProperty('--abhi-raised-shadow', '9px 9px 22px rgba(0, 0, 0, 0.43), -6px -6px 18px rgba(44, 69, 105, 0.11)');
      root.style.setProperty('--abhi-inset-shadow', 'inset 4px 4px 10px rgba(0, 0, 0, 0.40), inset -3px -3px 8px rgba(44, 74, 118, 0.10)');
      root.style.setProperty('--abhi-glow-bg', 'radial-gradient(circle at 50% 50%, rgba(20, 38, 70, 0.4) 0%, rgba(5, 8, 17, 0.85) 65%, #050811 100%)');
      root.style.setProperty('--abhi-rim-vignette', 'radial-gradient(circle at 50% 50%, transparent 55%, rgba(5, 8, 17, 0.45) 85%, rgba(5, 8, 17, 0.85) 100%)');
    }
  }
}
