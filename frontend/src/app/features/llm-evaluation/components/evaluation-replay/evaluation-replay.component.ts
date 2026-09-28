import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvaluationReplayService } from '../../services/evaluation-replay.service';
import { EvaluationService } from '../../services/evaluation.service';

@Component({
  selector: 'app-evaluation-replay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './evaluation-replay.component.html',
  styleUrls: ['./evaluation-replay.component.css']
})
export class EvaluationReplayComponent {
  readonly replayService = inject(EvaluationReplayService);
  readonly evalService = inject(EvaluationService);

  readonly speeds = [1, 2, 4, 5];

  onPlay(): void {
    this.replayService.start();
  }

  onPause(): void {
    this.replayService.pause();
  }

  onResume(): void {
    this.replayService.resume();
  }

  onStop(): void {
    this.replayService.stop();
  }

  onSpeedChange(speed: number): void {
    this.replayService.setSpeed(speed);
  }

  onFinish(): void {
    this.replayService.finish();
  }

  onRestart(): void {
    this.replayService.restartFromBeginning();
  }

  onLatest(): void {
    this.replayService.jumpToLatest();
  }

  onScrubberChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const day = parseInt(input.value, 10);
    this.replayService.pause();
    this.replayService.currentDayIndex.set(day);
    this.evalService.selectRunByDay(day);
  }
}
