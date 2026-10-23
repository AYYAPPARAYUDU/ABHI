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

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'abhi_theme_preference';

  readonly availablePresets: AbhiTheme[] = [
    OBSIDIAN_CYAN_THEME,
    MIDNIGHT_AMETHYST_THEME,
    EMERALD_MATRIX_THEME,
    QUANTUM_WHITE_THEME
  ];

  readonly currentTheme = signal<AbhiTheme>(OBSIDIAN_CYAN_THEME);
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
      root.style.setProperty('--abhi-raised-shadow', '12px 12px 28px rgba(0, 0, 0, 0.55), -6px -6px 20px rgba(0, 240, 255, 0.04)');
      root.style.setProperty('--abhi-inset-shadow', 'inset 4px 4px 12px rgba(0, 0, 0, 0.50), inset -3px -3px 8px rgba(0, 240, 255, 0.06)');
      root.style.setProperty('--abhi-glow-bg', 'radial-gradient(ellipse at 50% 48%, rgba(0, 240, 255, 0.09) 0%, rgba(168, 85, 247, 0.04) 30%, rgba(6, 11, 24, 0.9) 65%, #030712 100%)');
      root.style.setProperty('--abhi-rim-vignette', 'radial-gradient(circle at 50% 50%, transparent 45%, rgba(3, 7, 18, 0.55) 75%, rgba(2, 4, 10, 0.96) 100%)');
    }
  }
}
