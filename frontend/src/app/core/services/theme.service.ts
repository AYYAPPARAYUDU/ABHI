import { Injectable, signal, computed, effect, inject, Injector } from '@angular/core';

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
  category?: 'MODERN' | 'DARK' | 'WARM' | 'CYBER' | 'PRO';
  isCustom?: boolean;
  colors: AbhiThemeColors;
}

/**
 * 1. THEME A — AURORA OBSIDIAN (Default Pro Sovereign Palette)
 * Deep navy and graphite backgrounds, electric cyan and teal primary accents,
 * violet intelligence accents, emerald success states, warm amber warnings.
 */
export const AURORA_OBSIDIAN_THEME: AbhiTheme = {
  id: 'aurora-obsidian',
  label: 'Aurora Obsidian (Default)',
  category: 'DARK',
  isCustom: false,
  colors: {
    background: '#0b0f19',
    backgroundSecondary: '#0f172a',
    surfaceRaised: '#131d31',
    surfaceInset: '#070b14',
    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    accentPrimary: '#00f0ff',
    accentSecondary: '#8b5cf6',
    coreGlow: '#00f0ff',
    networkLine: '#38bdf8',
    active: '#00f0ff',
    border: 'rgba(255, 255, 255, 0.09)',
    borderActive: 'rgba(0, 240, 255, 0.5)',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444'
  }
};
export const OBSIDIAN_DARK_THEME = AURORA_OBSIDIAN_THEME;

/**
 * 2. THEME B — MIDNIGHT INDIGO (Deep Indigo, Blue & Violet Accents)
 * Deep indigo backgrounds, blue and violet accents, cyan interaction highlights,
 * soft neutral typography.
 */
export const MIDNIGHT_INDIGO_THEME: AbhiTheme = {
  id: 'midnight-indigo',
  label: 'Midnight Indigo',
  category: 'DARK',
  isCustom: false,
  colors: {
    background: '#080a1a',
    backgroundSecondary: '#0f142e',
    surfaceRaised: '#171e44',
    surfaceInset: '#060714',
    textPrimary: '#f8faff',
    textSecondary: '#c7d2fe',
    textMuted: '#818cf8',
    accentPrimary: '#3b82f6',
    accentSecondary: '#8b5cf6',
    coreGlow: '#3b82f6',
    networkLine: '#60a5fa',
    active: '#06b6d4',
    border: 'rgba(129, 140, 248, 0.18)',
    borderActive: 'rgba(59, 130, 246, 0.55)',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#f43f5e'
  }
};

/**
 * 3. THEME C — GRAPHITE EMERALD (Graphite Surfaces, Emerald & Teal Accents)
 * Graphite surfaces, emerald and teal accents, muted gold highlights,
 * premium restrained appearance.
 */
export const GRAPHITE_EMERALD_THEME: AbhiTheme = {
  id: 'graphite-emerald',
  label: 'Graphite Emerald',
  category: 'PRO',
  isCustom: false,
  colors: {
    background: '#111418',
    backgroundSecondary: '#181c22',
    surfaceRaised: '#222831',
    surfaceInset: '#0c0e11',
    textPrimary: '#f1f5f9',
    textSecondary: '#a7f3d0',
    textMuted: '#6ee7b7',
    accentPrimary: '#10b981',
    accentSecondary: '#14b8a6',
    coreGlow: '#10b981',
    networkLine: '#34d399',
    active: '#eab308',
    border: 'rgba(16, 185, 129, 0.2)',
    borderActive: 'rgba(16, 185, 129, 0.55)',
    success: '#10b981',
    warning: '#eab308',
    error: '#ef4444'
  }
};

/**
 * 4. THEME D — PORCELAIN LIGHT (Clean Off-White, Navy Typography, Blue & Teal Accents)
 * Soft off-white backgrounds, white and cool-grey surfaces, deep navy typography,
 * professional blue, teal and violet accents.
 */
export const PORCELAIN_LIGHT_THEME: AbhiTheme = {
  id: 'porcelain-light',
  label: 'Porcelain Light',
  category: 'MODERN',
  isCustom: false,
  colors: {
    background: '#f8fafc',
    backgroundSecondary: '#ffffff',
    surfaceRaised: '#ffffff',
    surfaceInset: '#f1f5f9',
    textPrimary: '#0f172a',
    textSecondary: '#334155',
    textMuted: '#64748b',
    accentPrimary: '#2563eb',
    accentSecondary: '#0d9488',
    coreGlow: '#2563eb',
    networkLine: '#3b82f6',
    active: '#7c3aed',
    border: 'rgba(15, 23, 42, 0.08)',
    borderActive: 'rgba(37, 99, 235, 0.45)',
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626'
  }
};
export const MODERN_LIGHT_THEME = PORCELAIN_LIGHT_THEME;

/**
 * 3. WARM NEUTRAL / FINTECH (Warm Cream, Espresso & Forest Emerald from User Specification)
 */
export const WARM_NEUTRAL_FINTECH_THEME: AbhiTheme = {
  id: 'warm-neutral',
  label: 'Warm Neutral / Fintech',
  category: 'WARM',
  isCustom: false,
  colors: {
    background: '#fbf9f5',
    backgroundSecondary: '#ffffff',
    surfaceRaised: '#ffffff',
    surfaceInset: '#f3efea',
    textPrimary: '#1c1917',
    textSecondary: '#44403c',
    textMuted: '#78716c',
    accentPrimary: '#0d7a57',
    accentSecondary: '#d97706',
    coreGlow: '#0d7a57',
    networkLine: '#10b981',
    active: '#0d7a57',
    border: 'rgba(68, 64, 60, 0.12)',
    borderActive: 'rgba(13, 122, 87, 0.5)',
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626'
  }
};

/**
 * 4. MIDNIGHT AMETHYST (Deep Space Violet, Neon Amethyst & Vivid Indigo from Specification)
 */
export const MIDNIGHT_AMETHYST_THEME: AbhiTheme = {
  id: 'midnight-amethyst',
  label: 'Midnight Amethyst',
  category: 'CYBER',
  isCustom: false,
  colors: {
    background: '#070512',
    backgroundSecondary: '#0f0a24',
    surfaceRaised: '#1a103c',
    surfaceInset: '#0b061a',
    textPrimary: '#f8f5ff',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    accentPrimary: '#c084fc',
    accentSecondary: '#38bdf8',
    coreGlow: '#c084fc',
    networkLine: '#818cf8',
    active: '#e879f9',
    border: 'rgba(192, 132, 252, 0.22)',
    borderActive: 'rgba(232, 121, 249, 0.55)',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#f43f5e'
  }
};

/**
 * 5. CYBER / AI NEON DARK (Cosmic Violet, Neon Cyan & Vivid Magenta)
 */
export const CYBER_NEON_DARK_THEME: AbhiTheme = {
  id: 'cyber-neon',
  label: 'Cyber / AI Neon Dark',
  category: 'CYBER',
  isCustom: false,
  colors: {
    background: '#080711',
    backgroundSecondary: '#0f0c1e',
    surfaceRaised: '#16132d',
    surfaceInset: '#0b0917',
    textPrimary: '#ffffff',
    textSecondary: '#c4b5fd',
    textMuted: '#8b7ca8',
    accentPrimary: '#7c3aed',
    accentSecondary: '#00f0ff',
    coreGlow: '#a855f7',
    networkLine: '#00f0ff',
    active: '#ec4899',
    border: 'rgba(168, 85, 247, 0.28)',
    borderActive: 'rgba(124, 58, 237, 0.65)',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ec4899'
  }
};

/**
 * 6. EMERALD MATRIX TERMINAL (Hacker Matrix Green)
 */
export const EMERALD_MATRIX_THEME: AbhiTheme = {
  id: 'emerald-matrix',
  label: 'Emerald Matrix Terminal',
  category: 'PRO',
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

/**
 * 7. ARDENA SUNSET CRIMSON (Deep Warm Solar Red)
 */
export const ARDENA_CRIMSON_THEME: AbhiTheme = {
  id: 'ardena-crimson',
  label: 'Ardena Sunset Crimson',
  category: 'PRO',
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

/**
 * 8. OMBRIA TITANIUM SLATE (Industrial Gold & Slate)
 */
export const OMBRIA_SLATE_THEME: AbhiTheme = {
  id: 'ombria-slate',
  label: 'Ombria Titanium Slate',
  category: 'PRO',
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

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  readonly ACTIVE_THEME_STORAGE_KEY = 'abhi_active_theme';
  readonly STORAGE_KEY = 'abhi_theme_preference';
  private readonly GLOW_STORAGE_KEY = 'abhi_theme_glow_mode';
  private readonly CONTRAST_STORAGE_KEY = 'abhi_theme_contrast_mode';
  private readonly DENSITY_STORAGE_KEY = 'abhi_theme_density_mode';
  private static readonly STYLE_TAG_ID = 'abhi-theme-root-vars';

  private readonly injector = inject(Injector);
  private threeSceneManagerInstance: any = null;

  /**
   * The 4 Primary Core Themes (Aurora Obsidian, Midnight Indigo, Graphite Emerald, Porcelain Light)
   * followed by additional specialized architectural palettes.
   */
  readonly availablePresets: readonly AbhiTheme[] = [
    AURORA_OBSIDIAN_THEME,
    MIDNIGHT_INDIGO_THEME,
    GRAPHITE_EMERALD_THEME,
    PORCELAIN_LIGHT_THEME,
    MIDNIGHT_AMETHYST_THEME,
    CYBER_NEON_DARK_THEME,
    EMERALD_MATRIX_THEME,
    OMBRIA_SLATE_THEME
  ];

  // DSA O(1) Hash Map with legacy ID aliasing
  private readonly presetMap = new Map<string, AbhiTheme>([
    [AURORA_OBSIDIAN_THEME.id, AURORA_OBSIDIAN_THEME],
    ['obsidian-dark', AURORA_OBSIDIAN_THEME],
    ['obsidian-cyan', AURORA_OBSIDIAN_THEME],
    [MIDNIGHT_INDIGO_THEME.id, MIDNIGHT_INDIGO_THEME],
    [GRAPHITE_EMERALD_THEME.id, GRAPHITE_EMERALD_THEME],
    [PORCELAIN_LIGHT_THEME.id, PORCELAIN_LIGHT_THEME],
    ['modern-light', PORCELAIN_LIGHT_THEME],
    ['quantum-white', PORCELAIN_LIGHT_THEME],
    [WARM_NEUTRAL_FINTECH_THEME.id, WARM_NEUTRAL_FINTECH_THEME],
    [MIDNIGHT_AMETHYST_THEME.id, MIDNIGHT_AMETHYST_THEME],
    ['midnight-amethyst', MIDNIGHT_AMETHYST_THEME],
    [CYBER_NEON_DARK_THEME.id, CYBER_NEON_DARK_THEME],
    ['cyber-neon', CYBER_NEON_DARK_THEME],
    ['sapphire-saas', AURORA_OBSIDIAN_THEME],
    [EMERALD_MATRIX_THEME.id, EMERALD_MATRIX_THEME],
    [ARDENA_CRIMSON_THEME.id, ARDENA_CRIMSON_THEME],
    [OMBRIA_SLATE_THEME.id, OMBRIA_SLATE_THEME]
  ]);

  readonly currentTheme = signal<AbhiTheme>(AURORA_OBSIDIAN_THEME);
  readonly previewTheme = signal<AbhiTheme | null>(null);

  // Advanced Visual Studio Controls
  readonly glowMode = signal<'SOFT' | 'VIVID' | 'MINIMAL'>('SOFT');
  readonly contrastMode = signal<'NORMAL' | 'HIGH'>('NORMAL');
  readonly densityMode = signal<'COMPACT' | 'BALANCED' | 'RELAXED'>('BALANCED');

  readonly activeTheme = computed(() => {
    return this.previewTheme() || this.currentTheme();
  });

  readonly isLightMode = computed(() => {
    const theme = this.activeTheme();
    const c = theme.colors;
    return (
      theme.id === 'modern-light' ||
      theme.id === 'warm-neutral' ||
      theme.id === 'quantum-white' ||
      c.background.toLowerCase().startsWith('#f') ||
      c.background.toLowerCase() === '#ffffff'
    );
  });

  private rafId: number | null = null;

  constructor() {
    this.loadSavedPreferences();

    // Effect to apply CSS variables atomically and synchronize Three.js neural core
    effect(() => {
      const theme = this.activeTheme();
      const glow = this.glowMode();
      const contrast = this.contrastMode();
      const density = this.densityMode();
      this.applyThemeToDOM(theme, glow, contrast, density);
      this.syncThreeScene(theme);
    });
  }

  private loadSavedPreferences(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const savedActive = localStorage.getItem(this.ACTIVE_THEME_STORAGE_KEY);
      const savedLegacy = localStorage.getItem(this.STORAGE_KEY);
      const saved = savedActive || savedLegacy;

      if (saved) {
        if (this.presetMap.has(saved)) {
          this.currentTheme.set(this.presetMap.get(saved)!);
        } else {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.id && this.presetMap.has(parsed.id)) {
              this.currentTheme.set(this.presetMap.get(parsed.id)!);
            } else if (parsed.colors) {
              this.currentTheme.set(parsed);
            }
          } catch {
            if (this.presetMap.has(saved)) {
              this.currentTheme.set(this.presetMap.get(saved)!);
            }
          }
        }
      }

      const savedGlow = localStorage.getItem(this.GLOW_STORAGE_KEY) as any;
      if (savedGlow && ['SOFT', 'VIVID', 'MINIMAL'].includes(savedGlow)) {
        this.glowMode.set(savedGlow);
      }

      const savedContrast = localStorage.getItem(this.CONTRAST_STORAGE_KEY) as any;
      if (savedContrast && ['NORMAL', 'HIGH'].includes(savedContrast)) {
        this.contrastMode.set(savedContrast);
      }

      const savedDensity = localStorage.getItem(this.DENSITY_STORAGE_KEY) as any;
      if (savedDensity && ['COMPACT', 'BALANCED', 'RELAXED'].includes(savedDensity)) {
        this.densityMode.set(savedDensity);
      }
    } catch {
      this.currentTheme.set(OBSIDIAN_DARK_THEME);
    }
  }

  setPreset(presetId: string): void {
    const found = this.presetMap.get(presetId);
    if (found) {
      this.currentTheme.set(found);
      this.previewTheme.set(null);
      this.persistCurrentTheme();
    }
  }

  /**
   * Sets the active theme mode across primary themes:
   * 'light' -> Modern Light Mode
   * 'dark' -> Obsidian Dark Mode
   * 'warm' -> Warm Neutral / Fintech
   * 'amethyst' / 'cyber' -> Midnight Amethyst
   */
  setMode(mode: 'light' | 'dark' | 'warm' | 'amethyst' | 'cyber'): void {
    switch (mode) {
      case 'light':
        this.setPreset('modern-light');
        break;
      case 'dark':
        this.setPreset('obsidian-dark');
        break;
      case 'warm':
        this.setPreset('warm-neutral');
        break;
      case 'amethyst':
        this.setPreset('midnight-amethyst');
        break;
      case 'cyber':
        this.setPreset('midnight-amethyst');
        break;
    }
  }

  setGlowMode(mode: 'SOFT' | 'VIVID' | 'MINIMAL'): void {
    this.glowMode.set(mode);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.GLOW_STORAGE_KEY, mode);
      } catch {}
    }
  }

  setContrastMode(mode: 'NORMAL' | 'HIGH'): void {
    this.contrastMode.set(mode);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.CONTRAST_STORAGE_KEY, mode);
      } catch {}
    }
  }

  setDensityMode(mode: 'COMPACT' | 'BALANCED' | 'RELAXED'): void {
    this.densityMode.set(mode);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.DENSITY_STORAGE_KEY, mode);
      } catch {}
    }
  }

  setLivePreviewColor(key: string, value: string): void {
    const base = this.activeTheme();
    const updated: AbhiTheme = {
      id: 'custom',
      label: 'Custom Studio Palette',
      isCustom: true,
      colors: {
        ...base.colors,
        [key]: value
      }
    };
    this.previewTheme.set(updated);
  }

  setLiveAccentColor(color: string): void {
    const base = this.activeTheme();
    const updated: AbhiTheme = {
      id: 'custom-' + base.id,
      label: `${base.label} (Custom Tint)`,
      isCustom: true,
      colors: {
        ...base.colors,
        accentPrimary: color,
        coreGlow: color,
        active: color
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
    this.currentTheme.set(OBSIDIAN_DARK_THEME);
    this.glowMode.set('SOFT');
    this.contrastMode.set('NORMAL');
    this.densityMode.set('BALANCED');
    this.previewTheme.set(null);
    this.persistCurrentTheme();
  }

  private persistCurrentTheme(): void {
    if (typeof localStorage === 'undefined') return;
    setTimeout(() => {
      try {
        const theme = this.currentTheme();
        // Persist under abhi_active_theme as required by specification
        localStorage.setItem(this.ACTIVE_THEME_STORAGE_KEY, theme.id);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(theme));
      } catch {}
    }, 0);
  }

  /**
   * Synchronizes Three.js neural core scene colors with the active theme
   */
  private syncThreeScene(theme: AbhiTheme): void {
    // 1. If we already have the instance cached, update immediately
    if (this.threeSceneManagerInstance && typeof this.threeSceneManagerInstance.updateThemeColors === 'function') {
      try {
        this.threeSceneManagerInstance.updateThemeColors(theme.colors);
      } catch (err) {
        console.warn('Direct ThreeSceneManagerService updateThemeColors error:', err);
      }
      return;
    }

    // 2. Dynamically import ThreeSceneManagerService to avoid circular dependency hazard
    try {
      import('../../shared/3d/three-scene-manager.service').then((m) => {
        try {
          const sceneManager = this.injector.get(m.ThreeSceneManagerService, null, { optional: true });
          if (sceneManager) {
            this.threeSceneManagerInstance = sceneManager;
            if (typeof sceneManager.updateThemeColors === 'function') {
              sceneManager.updateThemeColors(theme.colors);
            }
          }
        } catch (e) {
          // Guard for testing or environments without root scene
        }
      }).catch(() => {});
    } catch {}

    // 3. Dispatch browser event for custom components listening to theme shifts
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('abhi-theme-sync', {
          detail: { themeId: theme.id, colors: theme.colors }
        })
      );
    }
  }

  /**
   * Explicitly binds or triggers Three.js scene synchronization
   */
  notifySceneThemeSync(sceneManager?: any): void {
    if (sceneManager) {
      this.threeSceneManagerInstance = sceneManager;
    }
    this.syncThreeScene(this.activeTheme());
  }

  /**
   * Atomic Batched CSS Variable Injection with High-Contrast & Density Support
   */
  private applyThemeToDOM(
    theme: AbhiTheme,
    glow: 'SOFT' | 'VIVID' | 'MINIMAL',
    contrast: 'NORMAL' | 'HIGH',
    density: 'COMPACT' | 'BALANCED' | 'RELAXED'
  ): void {
    if (typeof document === 'undefined') return;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      const root = document.documentElement;
      const c = theme.colors;
      const isLight =
        theme.id === 'modern-light' ||
        theme.id === 'warm-neutral' ||
        theme.id === 'quantum-white' ||
        c.background.toLowerCase().startsWith('#f') ||
        c.background.toLowerCase() === '#ffffff';

      root.setAttribute('data-theme', theme.id);
      root.setAttribute('data-mode', isLight ? 'light' : 'dark');
      root.setAttribute('data-contrast', contrast.toLowerCase());
      root.setAttribute('data-density', density.toLowerCase());

      const densityPadding = density === 'COMPACT' ? '6px' : density === 'RELAXED' ? '14px' : '10px';
      const subtleBorder = contrast === 'HIGH' ? (isLight ? 'rgba(15, 23, 42, 0.22)' : 'rgba(255, 255, 255, 0.25)') : c.border;

      const cssVars = `
        :root {
          color-scheme: ${isLight ? 'light' : 'dark'};

          /* Standard Unified Theme Tokens */
          --bg-primary: ${c.background};
          --bg-secondary: ${c.backgroundSecondary};
          --surface-raised: ${c.surfaceRaised};
          --surface-inset: ${c.surfaceInset};
          --text-primary: ${c.textPrimary};
          --text-secondary: ${c.textSecondary};
          --text-muted: ${c.textMuted};
          --accent-primary: ${c.accentPrimary};
          --accent-secondary: ${c.accentSecondary};
          --core-glow: ${c.coreGlow};
          --border-subtle: ${subtleBorder};
          --border-active: ${c.borderActive};
          --success: ${c.success};
          --warning: ${c.warning};
          --error: ${c.error};

          /* Universal Typography Scale (Strict Minimum Readable Label Standard >= 0.75rem / 12px) */
          --text-xs: 0.75rem;
          --text-sm: 0.875rem;
          --text-base: 1rem;
          --text-lg: 1.125rem;
          --text-xl: 1.25rem;
          --text-2xl: 1.5rem;

          /* Abhi Legacy Design Token Aliases */
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
          --abhi-teal: #14b8a6;
          --abhi-indigo: #6366f1;
          --abhi-violet: #8b5cf6;
          --abhi-emerald: #10b981;
          --abhi-amber: #f59e0b;
          --abhi-coral: #f43f5e;
          --abhi-accent-cyan: ${c.accentPrimary};
          --abhi-accent-blue: ${c.accentSecondary};
          --abhi-border: ${subtleBorder};
          --abhi-border-subtle: ${subtleBorder};
          --abhi-border-active: ${c.borderActive};
          --abhi-focus-ring: 0 0 0 2px ${c.accentPrimary};
          --abhi-success: ${c.success};
          --abhi-warning: ${c.warning};
          --abhi-danger: ${c.error};
          --abhi-density-padding: ${densityPadding};
          --abhi-surface-glass: ${isLight ? 'rgba(255, 255, 255, 0.94)' : 'rgba(17, 24, 39, 0.88)'};
          --abhi-surface-card: ${c.surfaceRaised};
          --abhi-bg-surface-glass: ${isLight ? 'rgba(255, 255, 255, 0.94)' : 'rgba(17, 24, 39, 0.88)'};
          --abhi-bg-surface-card: ${c.surfaceRaised};
          --abhi-text-heading: ${c.textPrimary};
          --abhi-card-bg: ${c.surfaceRaised};
          --abhi-card-border: ${contrast === 'HIGH' ? (isLight ? 'rgba(15, 23, 42, 0.2)' : 'rgba(255, 255, 255, 0.22)') : subtleBorder};
          --abhi-card-text: ${c.textPrimary};

          /* Global Bootstrap Variable Synchronization */
          --bs-body-bg: ${c.background};
          --bs-body-color: ${c.textPrimary};
          --bs-dark-bg-subtle: ${c.surfaceInset};
          --bs-secondary-bg-subtle: ${c.surfaceRaised};
          --bs-secondary-color: ${c.textSecondary};
          --bs-tertiary-color: ${c.textMuted};
          --bs-border-color: ${subtleBorder};
          --bs-primary: ${c.accentPrimary};
          --bs-link-color: ${c.accentPrimary};

          --abhi-raised-shadow: ${
            isLight
              ? '0 8px 24px -4px rgba(15, 23, 42, 0.08), 0 2px 8px -2px rgba(15, 23, 42, 0.04)'
              : '0 12px 32px rgba(0, 0, 0, 0.6), 0 2px 8px rgba(0, 0, 0, 0.4)'
          };
          --abhi-inset-shadow: ${
            isLight
              ? 'inset 1px 1px 4px rgba(15, 23, 42, 0.06)'
              : 'inset 2px 2px 8px rgba(0, 0, 0, 0.55)'
          };
          --abhi-glow-bg: ${
            glow === 'MINIMAL'
              ? 'none'
              : isLight
              ? `radial-gradient(circle at 50% 0%, ${c.accentPrimary}14 0%, transparent 60%)`
              : `radial-gradient(ellipse at 50% 0%, ${c.accentPrimary}22 0%, ${c.accentSecondary}0d 40%, transparent 70%)`
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
