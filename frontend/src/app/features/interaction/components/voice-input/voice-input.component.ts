import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InteractionService } from '../../services/interaction.service';

@Component({
  selector: 'app-voice-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './voice-input.component.html',
  styleUrls: ['./voice-input.component.css']
})
export class VoiceInputComponent {
  readonly interactionService = inject(InteractionService);

  readonly voiceState = this.interactionService.voiceState;
  readonly isListening = this.interactionService.isListening;
  readonly transcript = this.interactionService.transcript;
  readonly state = this.interactionService.state;

  toggleVoice(): void {
    if (this.isListening()) {
      this.interactionService.stopVoiceSession();
    } else {
      this.interactionService.startVoiceSession();
    }
  }

  cancel(): void {
    this.interactionService.cancelInteraction();
  }
}
