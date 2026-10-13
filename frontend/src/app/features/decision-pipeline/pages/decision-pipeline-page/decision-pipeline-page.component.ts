import { Component, OnInit, OnDestroy, signal, computed, ElementRef, ViewChild, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AnimeAnimationService } from '../../../../core/services/anime-animation.service';
import { AnimeInteractiveDirective } from '../../../../shared/directives/anime-interactive.directive';
import { AnimeCounterDirective } from '../../../../shared/directives/anime-counter.directive';
import { ThemeService } from '../../../../core/services/theme.service';
import { DecisionPipelineService, DecisionNode, NodeConnection, UseCase, EvaluationResponse } from '../../../../core/services/decision-pipeline.service';

@Component({
  selector: 'app-decision-pipeline-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AnimeInteractiveDirective, AnimeCounterDirective],
  templateUrl: './decision-pipeline-page.component.html',
  styleUrl: './decision-pipeline-page.component.css'
})
export class DecisionPipelinePageComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('oscilloscopeCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private readonly animService = inject(AnimeAnimationService);
  private readonly hostEl = inject(ElementRef);
  readonly themeService = inject(ThemeService);
  readonly decisionService = inject(DecisionPipelineService);

  // Bind service signals to component
  readonly currentDecisions = this.decisionService.currentDecisions;
  readonly currentLatency = this.decisionService.currentLatency;
  readonly currentConfidence = this.decisionService.currentConfidence;
  readonly selectedTab = this.decisionService.selectedTab;
  readonly useCases = this.decisionService.useCases;
  readonly activeCase = this.decisionService.activeCase;
  readonly isEvaluating = this.decisionService.isEvaluating;
  readonly lastTrace = this.decisionService.lastTrace;
  readonly selectedNode = this.decisionService.selectedNode;
  readonly customInputJson = this.decisionService.customInputJson;
  readonly stats = this.decisionService.stats;

  readonly activeNodes = computed<DecisionNode[]>(() => {
    const ac = this.activeCase();
    return ac ? ac.nodes : [];
  });

  readonly activeConnections = computed<NodeConnection[]>(() => {
    const ac = this.activeCase();
    return ac ? ac.connections : [];
  });

  readonly runLogs = computed(() => {
    const trace = this.lastTrace();
    if (trace && trace.log_entries && trace.log_entries.length > 0) {
      return trace.log_entries;
    }
    return [
      { timestamp: '12:45:01', channel: 'encoder', text: 'Latent AST packed 2048-dim vector from input payload' },
      { timestamp: '12:45:02', channel: 'ask', text: 'Parallel questions evaluated: viral_fit=0.92, lead_quality=0.88' },
      { timestamp: '12:45:03', channel: 'jev', text: 'JEV decision matrix confirmed route: draft_short*' },
      { timestamp: '12:45:04', channel: 'gate', text: 'Physical guardrail check: human signoff mandated' },
      { timestamp: '12:45:05', channel: 'exec', text: 'Payload staged in review folder (awaiting operator trigger)' }
    ];
  });

  readonly isCopied = signal<boolean>(false);
  private simTimer: any;
  private animFrame: any;

  ngOnInit(): void {
    // Subtle background simulation ticker for decisions and latency
    this.simTimer = setInterval(() => {
      if (!this.isEvaluating()) {
        this.currentDecisions.update((d) => d + Math.floor(Math.random() * 2) + 1);
        this.currentLatency.set(248 + Math.floor(Math.random() * 12));
      }
    }, 3200);
  }

  ngAfterViewInit(): void {
    this.startOscilloscope();
    const root = this.hostEl.nativeElement;
    if (!root) return;

    // Tactile staggered enter animation on cards
    const cards = root.querySelectorAll('.top-metric-card, .active-case-bar, .pipeline-graph-canvas');
    if (cards.length > 0) {
      this.animService.staggerEnter({
        targets: cards,
        translateY: [12, 0],
        opacity: [0, 1],
        duration: 400,
        delay: 20
      });
    }
  }

  ngOnDestroy(): void {
    if (this.simTimer) clearInterval(this.simTimer);
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
  }

  selectUseCase(uc: UseCase, event?: MouseEvent): void {
    if (event?.currentTarget) {
      this.animService.tactileClick(event.currentTarget as HTMLElement);
    }
    this.decisionService.selectUseCase(uc.id);
  }

  setTab(tab: 'STATE' | 'ASK' | 'JEV' | 'GATE' | 'CODE', event?: MouseEvent): void {
    if (event?.currentTarget) {
      this.animService.tactileClick(event.currentTarget as HTMLElement);
    }
    this.selectedTab.set(this.selectedTab() === tab ? 'JEV' : tab);
  }

  onNodeClick(node: DecisionNode): void {
    this.selectedNode.set(this.selectedNode()?.id === node.id ? null : node);
  }

  closeNodeInspector(): void {
    this.selectedNode.set(null);
  }

  async runLiveEvaluation(override = false, event?: MouseEvent): Promise<void> {
    if (event?.currentTarget) {
      this.animService.tactileClick(event.currentTarget as HTMLElement);
    }

    try {
      const res = await this.decisionService.evaluateLiveDecision(override);
      const root = this.hostEl.nativeElement;
      const statusPill = root?.querySelector('.eval-live-btn');
      if (statusPill) {
        this.animService.celebrateSuccess(statusPill as HTMLElement);
      }
    } catch (err) {
      console.error('Decision evaluation error:', err);
    }
  }

  selectSampleInput(idx: number): void {
    this.decisionService.selectSampleInput(idx);
  }

  onJsonInput(e: Event): void {
    const val = (e.target as HTMLTextAreaElement).value;
    this.decisionService.setCustomJson(val);
  }

  copyCode(code: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      this.isCopied.set(true);
      setTimeout(() => this.isCopied.set(false), 2000);
    }
  }

  onImgErr(e: Event): void {
    (e.target as HTMLImageElement).src =
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="100%" height="100%" fill="%2306b6d4"/><text x="50%" y="55%" fill="white" font-size="16" font-family="sans-serif" font-weight="bold" dominant-baseline="middle" text-anchor="middle">AR</text></svg>';
  }

  getConnectionPath(conn: NodeConnection): string {
    const nodes = this.activeNodes();
    const fromNode = nodes.find((n) => n.id === conn.from);
    const toNode = nodes.find((n) => n.id === conn.to);
    if (!fromNode || !toNode) return '';

    const startX = fromNode.x + fromNode.width;
    const startY = fromNode.y + fromNode.height / 2;
    const endX = toNode.x;
    const endY = toNode.y + toNode.height / 2;
    const deltaX = Math.max(35, Math.abs(endX - startX) * 0.5);

    return `M ${startX} ${startY} C ${startX + deltaX} ${startY}, ${endX - deltaX} ${endY}, ${endX} ${endY}`;
  }

  private startOscilloscope(): void {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let offset = 0;
    const render = () => {
      offset += this.isEvaluating() ? 0.12 : 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const amplitude = this.isEvaluating() ? 22 : 14;
      const confRatio = this.currentConfidence();

      // Dynamically sample theme colors
      const activeTheme = this.themeService.activeTheme();
      const cPrimary = activeTheme?.colors?.accentPrimary || '#38d9ff';
      const cSecondary = activeTheme?.colors?.accentSecondary || '#397bff';
      const cSuccess = activeTheme?.colors?.success || '#48dda2';

      // Draw Wave 1 (Theme Accent - Score Head)
      ctx.beginPath();
      ctx.strokeStyle = cPrimary;
      ctx.lineWidth = 2.0;
      for (let x = 0; x < canvas.width; x++) {
        const y = 38 + Math.sin(x * 0.08 + offset) * amplitude + Math.cos(x * 0.04 + offset * 1.5) * 5;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw Wave 2 (Secondary Accent - Latent Frequency)
      ctx.beginPath();
      ctx.strokeStyle = cSecondary;
      ctx.lineWidth = 1.4;
      for (let x = 0; x < canvas.width; x++) {
        const y = 38 + Math.sin(x * 0.05 - offset * 0.8) * (amplitude * 0.75) + Math.cos(x * 0.1) * 3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw Wave 3 (Success/Confidence Threshold)
      ctx.beginPath();
      ctx.strokeStyle = cSuccess;
      ctx.lineWidth = 1.2;
      for (let x = 0; x < canvas.width; x++) {
        const y = 38 + Math.cos(x * 0.06 + offset * 0.5) * (8 * confRatio);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      this.animFrame = requestAnimationFrame(render);
    };

    render();
  }
}
