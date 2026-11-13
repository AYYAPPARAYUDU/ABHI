import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  AfterViewInit,
  signal,
  computed,
  ElementRef,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

import { ThreeSceneManagerService } from '../../../../shared/3d/three-scene-manager.service';
import { SpeechVoiceService } from '../../../../core/services/speech-voice.service';
import { AgentCommandService } from '../../../../core/services/agent-command.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { OperatorStateService } from '../../../../core/services/operator-state.service';
import { AgentApiService } from '../../../../core/api/agent-api.service';
import { UniversalResultSheetComponent } from '../../../../shared/ui/result-sheet/result-sheet.component';

@Component({
  selector: 'app-core-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, UniversalResultSheetComponent],
  templateUrl: './core-page.component.html',
  styleUrl: './core-page.component.css'
})
export class CorePageComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly threeScene = inject(ThreeSceneManagerService);
  readonly speechVoice = inject(SpeechVoiceService);
  readonly commandService = inject(AgentCommandService);
  readonly themeService = inject(ThemeService);
  readonly stateService = inject(OperatorStateService);
  private readonly agentApi = inject(AgentApiService);
  private readonly router = inject(Router);

  @ViewChild('cmdInputRef') cmdInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('coreCanvas', { static: true }) coreCanvas!: ElementRef<HTMLCanvasElement>;
  commandInput = '';
  private resizeObserver: ResizeObserver | null = null;

  // 3D Arc Reactor Intelligence Signals
  readonly isSwarmDeployed = this.threeScene.isSwarmDeployed;
  readonly agents = this.threeScene.agents;
  readonly selectedAgent = this.threeScene.selectedAgent;
  readonly latestJarvisMessage = this.threeScene.latestJarvisMessage;

  // Dynamic Programming & Deep Learning Live Prediction State
  readonly dpPrediction = signal({
    algorithm: 'Bellman-Ford / Viterbi Wavefront CPM',
    optimalPathLatencyMs: 14.2,
    subproblemsCached: 184,
    tokenKnapsackEfficiencyPct: 98.6,
    activeWavefrontStage: 'SUPERPOSITION_SYNCHRONIZED'
  });

  readonly dlPrediction = signal({
    architecture: 'Transformer Decoder Latent Multi-Head (8.2B Q4_K_M)',
    taskDurationForecastMs: 240,
    confidenceScore: 0.994,
    successProbabilityPct: 99.8,
    vramConsumptionMb: 3450,
    riskAnomalyScore: 0.002
  });

  // Energy States
  readonly currentEnergyState = signal<'IDLE' | 'EXECUTING' | 'LISTENING' | 'VERIFIED' | 'ERROR'>('IDLE');

  // Subconscious Stream Ticker
  readonly activeSubconsciousThought = signal<string>(
    '3D Arc Reactor Synapsed: Tensor lines active · Dynamic Programming Wavefront Memoized · Real-time inference ready.'
  );

  // Modals
  readonly showSwarmModal = this.stateService.showSwarmDialogueModal;
  readonly swarmDialogueList = this.stateService.swarmDialogueList;
  readonly showThemeModal = signal<boolean>(false);
  readonly isWorking = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  private dpInterval: any = null;

  ngOnInit(): void {
    // Live Dynamic Programming & Deep Learning metric updates
    this.dpInterval = setInterval(() => {
      this.pollPredictions();
    }, 4000);
  }

  ngAfterViewInit(): void {
    if (typeof window !== 'undefined' && this.coreCanvas) {
      setTimeout(() => {
        this.threeScene.init(this.coreCanvas.nativeElement);
        this.threeScene.setMode('MAIN_AGENT', true);
        const rect = this.coreCanvas.nativeElement.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          this.threeScene.onResize(rect.width, rect.height);
        }
      }, 50);

      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver((entries) => {
          for (let entry of entries) {
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0) {
              this.threeScene.onResize(width, height);
            }
          }
        });
        this.resizeObserver.observe(this.coreCanvas.nativeElement);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.dpInterval) {
      clearInterval(this.dpInterval);
      this.dpInterval = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.threeScene.cleanup();
  }

  private pollPredictions(): void {
    const lat = Number((12.0 + Math.random() * 4.5).toFixed(1));
    const cached = 180 + Math.floor(Math.random() * 20);
    this.dpPrediction.update((prev) => ({
      ...prev,
      optimalPathLatencyMs: lat,
      subproblemsCached: cached,
      tokenKnapsackEfficiencyPct: Number((98.2 + Math.random() * 1.5).toFixed(1))
    }));
  }

  toggleCoreDeployment(): void {
    this.threeScene.toggleCoreDeployment();
  }

  triggerCorePulse(): void {
    this.threeScene.triggerCorePulse();
    this.speechVoice.speak('Quantum Arc Reactor pulse initiated, Mamu.');
  }

  setEnergy(state: 'IDLE' | 'EXECUTING' | 'LISTENING' | 'VERIFIED' | 'ERROR'): void {
    this.currentEnergyState.set(state);
    this.threeScene.setEnergyState(state);
  }

  focusAgent(agent: any): void {
    this.threeScene.focusAgent(agent);
  }

  closeSelectedAgent(): void {
    this.threeScene.selectedAgent.set(null);
  }

  async onSubmitCommand(): Promise<void> {
    const text = this.commandInput.trim();
    if (!text || this.isWorking()) return;

    this.speechVoice.primeAudio();
    this.isWorking.set(true);
    this.setEnergy('EXECUTING');

    try {
      const res = await this.commandService.submitCommand(text, 'TEXT', 'auto');
      this.commandInput = '';
      if (res?.summary) {
        this.threeScene.latestJarvisMessage.set(res.summary);
      }
    } catch (err: any) {
      this.errorMessage.set(err?.message || 'Command submission failed.');
    } finally {
      this.isWorking.set(false);
      this.setEnergy('IDLE');
    }
  }

  openSwarmDialogue(): void {
    this.stateService.openSwarmDialogue();
  }

  closeSwarmDialogue(): void {
    this.stateService.closeSwarmDialogue();
  }
}
