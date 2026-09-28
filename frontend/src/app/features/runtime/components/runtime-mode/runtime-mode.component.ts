import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RuntimeService } from '../../services/runtime.service';
import { PanelComponent } from '../../../../shared/components/panel/panel.component';

@Component({
  selector: 'app-runtime-mode',
  standalone: true,
  imports: [CommonModule, PanelComponent],
  templateUrl: './runtime-mode.component.html',
  styleUrl: './runtime-mode.component.css'
})
export class RuntimeModeComponent {
  private readonly runtimeService = inject(RuntimeService);

  readonly state = this.runtimeService.state;

  async setMode(mode: string): Promise<void> {
    if (mode === 'wake') await this.runtimeService.wakeAssistant();
    else if (mode === 'sleep') await this.runtimeService.sleepAssistant();
    else if (mode === 'arm') await this.runtimeService.armAssistant();
    else if (mode === 'lock') await this.runtimeService.lockAssistant();
  }
}
