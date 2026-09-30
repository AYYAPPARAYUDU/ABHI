import { Component, ElementRef, OnInit, OnDestroy, ViewChild, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThreeSceneManagerService } from '../three-scene-manager.service';
import { OperatorStateService } from '../../../core/services/operator-state.service';

@Component({
  selector: 'app-spatial-background',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="spatial-background-container fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <!-- Three.js Canvas Layer -->
      <canvas #bgCanvas class="w-full h-full block opacity-70"></canvas>

      <!-- Ambient Glow & Radial Vignette Overlay -->
      <div class="absolute inset-0 bg-radial-vignette"></div>
      
      <!-- Fallback Gradient when WebGL is inactive -->
      <div *ngIf="!is3DActive" class="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40"></div>
    </div>
  `,
  styles: [`
    .bg-radial-vignette {
      background: radial-gradient(circle at 50% 40%, rgba(6, 182, 212, 0.04) 0%, rgba(15, 23, 42, 0.6) 60%, rgba(2, 6, 23, 0.95) 100%);
    }
  `]
})
export class SpatialBackgroundComponent implements OnInit, OnDestroy {
  @ViewChild('bgCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private threeManager = inject(ThreeSceneManagerService);
  private stateService = inject(OperatorStateService);

  is3DActive = true;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    // React to global spatialMode changes
    effect(() => {
      const mode = this.stateService.spatialMode();
      this.threeManager.setMode(mode);
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
            this.threeManager.onResize(width, height);
          }
        });
        this.resizeObserver.observe(this.canvasRef.nativeElement);
      }
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
