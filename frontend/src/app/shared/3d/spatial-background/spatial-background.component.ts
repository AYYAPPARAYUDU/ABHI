import { Component, ElementRef, OnInit, AfterViewInit, OnDestroy, ViewChild, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThreeSceneManagerService } from '../three-scene-manager.service';
import { OperatorStateService } from '../../../core/services/operator-state.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-spatial-background',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spatial-background.component.html',
  styleUrl: './spatial-background.component.css'
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
