import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerceptionService } from '../../services/perception.service';
import { PanelComponent } from '../../../../shared/components/panel/panel.component';

@Component({
  selector: 'app-voice-state',
  standalone: true,
  imports: [CommonModule, PanelComponent],
  templateUrl: './voice-state.component.html',
  styleUrl: './voice-state.component.css'
})
export class VoiceStateComponent {
  private readonly perceptionService = inject(PerceptionService);

  readonly voice = this.perceptionService.voice;
  readonly isListening = this.perceptionService.isVoiceActive;

  toggleMic(): void {
    this.perceptionService.toggleMicrophone();
  }

  getStateBadgeClass(): string {
    const s = this.voice().sessionState;
    if (s === 'LISTENING' || s === 'VOICE_DETECTED') return 'bg-success text-success';
    if (s === 'TRANSCRIBING' || s === 'UNDERSTANDING') return 'bg-warning text-warning';
    if (s === 'CANONICALIZED' || s === 'TRANSCRIBED') return 'bg-info text-info';
    if (s === 'ERROR') return 'bg-danger text-danger';
    return 'bg-secondary text-secondary';
  }
}
