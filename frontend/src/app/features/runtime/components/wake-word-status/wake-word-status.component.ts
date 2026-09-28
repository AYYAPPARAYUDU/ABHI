import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RuntimeService } from '../../services/runtime.service';
import { PanelComponent } from '../../../../shared/components/panel/panel.component';

@Component({
  selector: 'app-wake-word-status',
  standalone: true,
  imports: [CommonModule, PanelComponent],
  templateUrl: './wake-word-status.component.html',
  styleUrl: './wake-word-status.component.css'
})
export class WakeWordStatusComponent {
  private readonly runtimeService = inject(RuntimeService);

  readonly state = this.runtimeService.state;
  readonly lastEvent = this.runtimeService.lastWakeWordEvent;

  async triggerWake(): Promise<void> {
    await this.runtimeService.triggerWakeWord(0.96);
  }
}
