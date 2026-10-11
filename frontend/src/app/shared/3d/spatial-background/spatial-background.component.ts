import { Component, ElementRef, OnInit, AfterViewInit, OnDestroy, ViewChild, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThreeSceneManagerService } from '../three-scene-manager.service';
import { OperatorStateService } from '../../../core/services/operator-state.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-spatial-background',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="spatial-background-container" role="presentation">
      <!-- Ambient Cosmic Glow (Behind canvas) -->
      <div class="spatial-ambient-glow"></div>

      <!-- Three.js Real WebGL Canvas Layer -->
      <canvas #bgCanvas class="spatial-webgl-canvas"></canvas>

      <!-- Soft Rim Vignette (Edges only, transparent center) -->
      <div class="spatial-rim-vignette"></div>

      <!-- Fallback Gradient when WebGL is inactive -->
      @if (!is3DActive) {
        <div class="spatial-fallback-gradient"></div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
    }

    .spatial-background-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: var(--abhi-bg, #f5f7fb);
      transition: background-color 0.3s ease;
      overflow: hidden;
    }

    .spatial-ambient-glow {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: var(--abhi-glow-bg, radial-gradient(circle at 50% 50%, rgba(0, 153, 204, 0.12) 0%, rgba(245, 247, 251, 0.65) 65%, #f5f7fb 100%));
      transition: background 0.3s ease;
      z-index: 1;
    }

    .spatial-webgl-canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100% !important;
      height: 100% !important;
      display: block;
      opacity: 1 !important;
      z-index: 2;
    }

    .spatial-rim-vignette {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      background: var(--abhi-rim-vignette, radial-gradient(circle at 50% 50%, transparent 60%, rgba(220, 228, 240, 0.45) 85%, rgba(210, 220, 235, 0.7) 100%));
      transition: background 0.3s ease;
      z-index: 3;
    }

    .spatial-fallback-gradient {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, var(--abhi-bg, #f5f7fb) 0%, var(--abhi-surface-raised, #ffffff) 50%, var(--abhi-surface-inset, #eaf0f8) 100%);
      z-index: 4;
    }
  `]
})
export class SpatialBackgroundComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('bgCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private threeManager = inject(ThreeSceneManagerService);
  private stateService = inject(OperatorStateService);
  private themeService = inject(ThemeService);

  is3DActive = true;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    // React to global spatialMode changes
    effect(() => {
      const mode = this.stateService.spatialMode();
      this.threeManager.setMode(mode);
    });

    // React to theme color changes and update Three.js scene materials & lighting
    effect(() => {
      const theme = this.themeService.activeTheme();
      this.threeManager.updateThemeColors(theme.colors);
    });
  }

  ngOnInit(): void {
    if (typeof window !== 'undefined' && this.canvasRef) {
      const success = this.threeManager.init(this.canvasRef.nativeElement);
      this.is3DActive = success;

      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver((entries) => {
          for (let entry of entries) {
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0) {
              this.threeManager.onResize(width, height);
            }
          }
        });
        this.resizeObserver.observe(this.canvasRef.nativeElement);
      }
    }
  }

  ngAfterViewInit(): void {
    if (typeof window !== 'undefined') {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.threeManager.onResize(w, h);
    }
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.threeManager.cleanup();
  }
}

