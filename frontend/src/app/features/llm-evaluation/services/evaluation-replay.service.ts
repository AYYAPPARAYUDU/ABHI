import { Injectable, signal, inject, effect } from '@angular/core';
import { EvaluationService } from './evaluation.service';

@Injectable({
  providedIn: 'root'
})
export class EvaluationReplayService {
  private readonly evalService = inject(EvaluationService);

  // Replay State Signals
  readonly isPlaying = signal<boolean>(false);
  readonly speedMultiplier = signal<number>(1);
  readonly currentDayIndex = signal<number>(1);
  readonly isLiveMode = signal<boolean>(false);

  private timerHandle: any = null;
  private readonly baseIntervalMs = 1200; // 1.2s per historical day at 1x

  constructor() {
    // Synchronize initial day index
    effect(() => {
      const selected = this.evalService.selectedRun();
      if (selected && !this.isPlaying()) {
        this.currentDayIndex.set(selected.day_index);
      }
    });
  }

  get totalDays(): number {
    return this.evalService.runs().length || 1;
  }

  start(): void {
    if (this.isPlaying()) return;
    this.isLiveMode.set(false);
    this.isPlaying.set(true);
    this._scheduleNextTick();
  }

  pause(): void {
    this.isPlaying.set(false);
    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }
  }

  resume(): void {
    if (!this.isPlaying()) {
      this.start();
    }
  }

  stop(): void {
    this.pause();
    // Preserves current viewport/state as required
  }

  setSpeed(multiplier: number): void {
    const valid = [1, 2, 4, 5].includes(multiplier) ? multiplier : 1;
    this.speedMultiplier.set(valid);
    if (this.isPlaying()) {
      // Re-arm timer at new interval
      if (this.timerHandle) clearTimeout(this.timerHandle);
      this._scheduleNextTick();
    }
  }

  finish(): void {
    this.pause();
    const maxDay = this.totalDays;
    this.currentDayIndex.set(maxDay);
    this.evalService.selectRunByDay(maxDay);
  }

  restartFromBeginning(): void {
    this.pause();
    this.currentDayIndex.set(1);
    this.evalService.selectRunByDay(1);
  }

  jumpToLatest(): void {
    this.pause();
    const maxDay = this.totalDays;
    this.currentDayIndex.set(maxDay);
    this.evalService.selectRunByDay(maxDay);
  }

  setLiveMode(live: boolean): void {
    if (live) {
      this.pause();
      this.isLiveMode.set(true);
      const maxDay = this.totalDays;
      this.currentDayIndex.set(maxDay);
      this.evalService.selectRunByDay(maxDay);
    } else {
      this.isLiveMode.set(false);
    }
  }

  private _scheduleNextTick(): void {
    const interval = Math.max(100, Math.floor(this.baseIntervalMs / this.speedMultiplier()));
    this.timerHandle = setTimeout(() => {
      this._tick();
    }, interval);
  }

  private _tick(): void {
    if (!this.isPlaying()) return;

    let nextDay = this.currentDayIndex() + 1;
    if (nextDay > this.totalDays) {
      // Finished replay run
      this.pause();
      return;
    }

    this.currentDayIndex.set(nextDay);
    this.evalService.selectRunByDay(nextDay);

    // Continue loop
    this._scheduleNextTick();
  }
}
