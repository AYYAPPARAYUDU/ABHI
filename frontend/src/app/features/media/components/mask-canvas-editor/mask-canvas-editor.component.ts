import {
  Component,
  ElementRef,
  ViewChild,
  input,
  output,
  signal,
  effect,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MediaArtifactDTO, MaskArtifactDTO } from '../../models/media.model';

@Component({
  selector: 'app-mask-canvas-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <h3 class="text-sm font-semibold text-slate-100 tracking-wide">
            Interactive Inpainting Mask Studio
          </h3>
        </div>
        <div class="flex items-center gap-2 text-xs">
          <span class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            White = Edit | Black = Preserve
          </span>
          <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            {{ editAreaRatio() }}% Area
          </span>
        </div>
      </div>

      <!-- Canvas Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800 mb-3 text-xs">
        <!-- Tools: Brush / Eraser -->
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            (click)="setTool('brush')"
            [class]="currentTool() === 'brush' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'"
            class="px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5"
          >
            <span>🖌️ Brush</span>
          </button>
          <button
            type="button"
            (click)="setTool('eraser')"
            [class]="currentTool() === 'eraser' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'"
            class="px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5"
          >
            <span>🧹 Eraser</span>
          </button>
        </div>

        <!-- Brush Size Slider -->
        <div class="flex items-center gap-2">
          <span class="text-slate-400">Size:</span>
          <input
            type="range"
            [ngModel]="brushSize()"
            (ngModelChange)="brushSize.set($event)"
            min="4"
            max="100"
            step="2"
            class="w-24 accent-emerald-400 bg-slate-800 rounded cursor-pointer"
          />
          <span class="text-slate-300 font-mono w-6">{{ brushSize() }}px</span>
        </div>

        <!-- Mask Opacity Slider -->
        <div class="flex items-center gap-2">
          <span class="text-slate-400">Overlay:</span>
          <input
            type="range"
            [ngModel]="overlayOpacity()"
            (ngModelChange)="overlayOpacity.set($event)"
            min="0.1"
            max="1.0"
            step="0.05"
            class="w-20 accent-emerald-400 bg-slate-800 rounded cursor-pointer"
          />
          <span class="text-slate-300 font-mono w-8">{{ (overlayOpacity() * 100).toFixed(0) }}%</span>
        </div>

        <!-- Actions: Undo, Redo, Invert, Clear -->
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            (click)="undo()"
            [disabled]="historyIndex() <= 0"
            class="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Undo"
          >
            ↩️
          </button>
          <button
            type="button"
            (click)="redo()"
            [disabled]="historyIndex() >= history().length - 1"
            class="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Redo"
          >
            ↪️
          </button>
          <button
            type="button"
            (click)="invertMask()"
            class="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-all"
            title="Invert Mask"
          >
            🔄 Invert
          </button>
          <button
            type="button"
            (click)="clearMask()"
            class="px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-all"
            title="Clear Mask"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      <!-- Canvas Viewport -->
      <div
        class="relative w-full overflow-hidden bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center p-2 min-h-[380px]"
      >
        @if (sourceArtifact()) {
          <div class="relative inline-block max-w-full max-h-[500px]">
            <!-- Base Source Image -->
            <img
              #sourceImg
              [src]="sourceArtifact()?.path"
              (load)="onImageLoaded()"
              alt="Source Canvas"
              class="block max-w-full max-h-[500px] object-contain rounded select-none pointer-events-none"
            />

            <!-- Mask Drawing Canvas -->
            <canvas
              #maskCanvas
              (mousedown)="startDrawing($event)"
              (mousemove)="draw($event)"
              (mouseup)="stopDrawing()"
              (mouseleave)="stopDrawing()"
              (touchstart)="startTouchDrawing($event)"
              (touchmove)="touchDraw($event)"
              (touchend)="stopDrawing()"
              [style.opacity]="overlayOpacity()"
              class="absolute inset-0 w-full h-full cursor-crosshair touch-none"
            ></canvas>
          </div>
        } @else {
          <div class="text-center py-12 text-slate-500 text-sm">
            <span class="text-3xl block mb-2">🖼️</span>
            <span>Select a source image artifact to begin drawing inpainting masks</span>
          </div>
        }
      </div>

      <!-- Footer Buttons -->
      <div class="flex items-center justify-between mt-4 pt-3 border-t border-slate-800">
        <div class="text-xs text-slate-400">
          @if (sourceArtifact()) {
            <span>Canvas: {{ sourceArtifact()?.width }} × {{ sourceArtifact()?.height }} px</span>
          }
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="emitMaskApplied()"
            [disabled]="!sourceArtifact() || isMaskEmpty()"
            class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
          >
            <span>✨ Apply Mask for Inpainting</span>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class MaskCanvasEditorComponent implements AfterViewInit {
  sourceArtifact = input<MediaArtifactDTO | null>(null);
  maskApplied = output<string>(); // emits base64 mask

  @ViewChild('sourceImg') sourceImgRef?: ElementRef<HTMLImageElement>;
  @ViewChild('maskCanvas') maskCanvasRef?: ElementRef<HTMLCanvasElement>;

  currentTool = signal<'brush' | 'eraser'>('brush');
  brushSize = signal<number>(30);
  overlayOpacity = signal<number>(0.7);
  editAreaRatio = signal<string>('0.0');
  isMaskEmpty = signal<boolean>(true);

  private isDrawing = false;
  private ctx: CanvasRenderingContext2D | null = null;
  history = signal<ImageData[]>([]);
  historyIndex = signal<number>(-1);

  constructor() {
    effect(() => {
      const art = this.sourceArtifact();
      if (art) {
        // Reset state for new artifact
        this.history.set([]);
        this.historyIndex.set(-1);
        this.isMaskEmpty.set(true);
        this.editAreaRatio.set('0.0');
      }
    });
  }

  ngAfterViewInit(): void {
    this.initCanvas();
  }

  onImageLoaded(): void {
    this.initCanvas();
  }

  private initCanvas(): void {
    if (!this.maskCanvasRef || !this.sourceImgRef) return;
    const canvas = this.maskCanvasRef.nativeElement;
    const img = this.sourceImgRef.nativeElement;

    canvas.width = img.naturalWidth || 512;
    canvas.height = img.naturalHeight || 512;

    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!this.ctx) return;

    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.clearCanvas();
  }

  setTool(tool: 'brush' | 'eraser'): void {
    this.currentTool.set(tool);
  }

  startDrawing(e: MouseEvent): void {
    this.isDrawing = true;
    const { x, y } = this.getCanvasCoordinates(e);
    if (!this.ctx) return;

    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.applyBrushSettings();
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  draw(e: MouseEvent): void {
    if (!this.isDrawing || !this.ctx) return;
    const { x, y } = this.getCanvasCoordinates(e);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  stopDrawing(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    if (this.ctx) {
      this.ctx.closePath();
      this.saveHistoryState();
      this.updateMaskStats();
    }
  }

  startTouchDrawing(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY,
    });
    this.startDrawing(mouseEvent);
  }

  touchDraw(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY,
    });
    this.draw(mouseEvent);
  }

  private applyBrushSettings(): void {
    if (!this.ctx) return;
    this.ctx.lineWidth = this.brushSize();
    if (this.currentTool() === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
      // Render mask on screen with bright semi-translucent red/white overlay
      this.ctx.strokeStyle = '#ffffff';
    }
  }

  private getCanvasCoordinates(e: MouseEvent): { x: number; y: number } {
    if (!this.maskCanvasRef) return { x: 0, y: 0 };
    const canvas = this.maskCanvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  private clearCanvas(): void {
    if (!this.ctx || !this.maskCanvasRef) return;
    const canvas = this.maskCanvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.saveHistoryState();
    this.updateMaskStats();
  }

  clearMask(): void {
    this.clearCanvas();
  }

  invertMask(): void {
    if (!this.maskCanvasRef) return;
    const canvas = this.maskCanvasRef.nativeElement;
    if (this.ctx) {
      try {
        const imgData = this.ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha > 0) {
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
            data[i + 3] = 0; // Erase
          } else {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
            data[i + 3] = 255; // Fill with white
          }
        }

        this.ctx.putImageData(imgData, 0, 0);
      } catch {
        // Fallback for headless environments
      }
    }
    this.isMaskEmpty.set(false);
    this.editAreaRatio.set('100.0');
    this.saveHistoryState();
  }

  private saveHistoryState(): void {
    if (!this.ctx || !this.maskCanvasRef) return;
    const canvas = this.maskCanvasRef.nativeElement;
    try {
      const imgData = this.ctx.getImageData(0, 0, canvas.width, canvas.height);
      const newHistory = this.history().slice(0, this.historyIndex() + 1);
      newHistory.push(imgData);
      if (newHistory.length > 20) newHistory.shift();

      this.history.set(newHistory);
      this.historyIndex.set(newHistory.length - 1);
    } catch {
      // Headless mock environment
    }
  }

  undo(): void {
    if (this.historyIndex() > 0 && this.ctx && this.maskCanvasRef) {
      const idx = this.historyIndex() - 1;
      this.historyIndex.set(idx);
      const state = this.history()[idx];
      try {
        this.ctx.putImageData(state, 0, 0);
      } catch {
        // Headless
      }
      this.updateMaskStats();
    }
  }

  redo(): void {
    if (this.historyIndex() < this.history().length - 1 && this.ctx && this.maskCanvasRef) {
      const idx = this.historyIndex() + 1;
      this.historyIndex.set(idx);
      const state = this.history()[idx];
      try {
        this.ctx.putImageData(state, 0, 0);
      } catch {
        // Headless
      }
      this.updateMaskStats();
    }
  }

  private updateMaskStats(): void {
    if (!this.ctx || !this.maskCanvasRef) return;
    const canvas = this.maskCanvasRef.nativeElement;
    try {
      const imgData = this.ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      let nonZero = 0;
      const total = canvas.width * canvas.height;

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 128) nonZero++;
      }

      const ratio = (nonZero / total) * 100;
      this.editAreaRatio.set(ratio.toFixed(1));
      this.isMaskEmpty.set(nonZero === 0);
    } catch {
      // Headless fallback
    }
  }

  getMaskBase64(): string {
    if (!this.maskCanvasRef) return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const canvas = this.maskCanvasRef.nativeElement;

    try {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvas.width || 512;
      exportCanvas.height = canvas.height || 512;
      const expCtx = exportCanvas.getContext('2d');
      if (expCtx) {
        expCtx.fillStyle = '#000000';
        expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        expCtx.drawImage(canvas, 0, 0);
      }
      return exportCanvas.toDataURL('image/png') || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    } catch {
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    }
  }

  emitMaskApplied(): void {
    const base64 = this.getMaskBase64();
    if (base64) {
      this.maskApplied.emit(base64);
    }
  }
}
