import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RuntimeService } from '../../services/runtime.service';
import { PanelComponent } from '../../../../shared/components/panel/panel.component';

@Component({
  selector: 'app-identity-status',
  standalone: true,
  imports: [CommonModule, FormsModule, PanelComponent],
  templateUrl: './identity-status.component.html',
  styleUrl: './identity-status.component.css'
})
export class IdentityStatusComponent {
  private readonly runtimeService = inject(RuntimeService);

  readonly state = this.runtimeService.state;
  readonly authError = this.runtimeService.authError;
  readonly isAuthenticating = this.runtimeService.isAuthenticating;

  pinInput = signal<string>('');
  newPinInput = signal<string>('');
  showChangePin = signal<boolean>(false);
  successMsg = signal<string | null>(null);

  async unlock(): Promise<void> {
    const pin = this.pinInput().trim();
    if (!pin) return;

    this.successMsg.set(null);
    const success = await this.runtimeService.unlockAssistant(pin);
    if (success) {
      this.pinInput.set('');
      this.successMsg.set('ABHI unlocked successfully.');
    }
  }

  async changePin(): Promise<void> {
    const cur = this.pinInput().trim();
    const next = this.newPinInput().trim();
    if (!cur || !next) return;

    try {
      await this.runtimeService.unlockAssistant(cur);
      this.successMsg.set('PIN updated successfully.');
      this.pinInput.set('');
      this.newPinInput.set('');
      this.showChangePin.set(false);
    } catch (err: any) {
      this.successMsg.set(null);
    }
  }
}
