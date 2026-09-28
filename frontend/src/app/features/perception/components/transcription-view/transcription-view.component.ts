import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerceptionService } from '../../services/perception.service';
import { PanelComponent } from '../../../../shared/components/panel/panel.component';

@Component({
  selector: 'app-transcription-view',
  standalone: true,
  imports: [CommonModule, PanelComponent],
  templateUrl: './transcription-view.component.html',
  styleUrl: './transcription-view.component.css'
})
export class TranscriptionViewComponent {
  private readonly perceptionService = inject(PerceptionService);

  readonly transcriptions = this.perceptionService.transcriptions;
  readonly voice = this.perceptionService.voice;

  formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString();
  }
}
