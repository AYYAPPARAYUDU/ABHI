import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InteractionService } from '../../services/interaction.service';
import { CommandInputComponent } from '../../components/command-input/command-input.component';
import { VoiceInputComponent } from '../../components/voice-input/voice-input.component';
import { GestureStatusComponent } from '../../components/gesture-status/gesture-status.component';
import { CommandPreviewComponent } from '../../components/command-preview/command-preview.component';
import { InteractionStatusComponent } from '../../components/interaction-status/interaction-status.component';

@Component({
  selector: 'app-interaction-page',
  standalone: true,
  imports: [
    CommonModule,
    CommandInputComponent,
    VoiceInputComponent,
    GestureStatusComponent,
    CommandPreviewComponent,
    InteractionStatusComponent
  ],
  templateUrl: './interaction-page.component.html',
  styleUrls: ['./interaction-page.component.css']
})
export class InteractionPageComponent {
  readonly interactionService = inject(InteractionService);

  readonly state = this.interactionService.state;
  readonly activeMode = this.interactionService.mode;
  readonly preview = this.interactionService.preview;

  setMode(mode: 'TEXT' | 'VOICE' | 'GESTURE'): void {
    this.interactionService.setMode(mode);
  }
}
