import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommunicationsAssistantService, InboxMessage } from '../../../core/services/communications-assistant.service';

@Component({
  selector: 'app-assistant-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './assistant-modal.component.html',
  styleUrl: './assistant-modal.component.css'
})
export class AssistantModalComponent {
  readonly assistant = inject(CommunicationsAssistantService);

  isEditingProfile = signal<boolean>(false);
  inputEmail = '';
  inputPhone = '';
  inputWhatsapp = true;
  inputMode: 'HUMAN_CONFIRMATION' | 'FULLY_AUTONOMOUS' = 'HUMAN_CONFIRMATION';
  inputThreads = '';

  customReplyText = signal<string>('');

  toggleEditProfile(): void {
    const prof = this.assistant.profile();
    if (prof) {
      this.inputEmail = prof.email || '';
      this.inputPhone = prof.phone_number || '';
      this.inputWhatsapp = prof.whatsapp_enabled;
      this.inputMode = prof.auto_reply_mode;
      this.inputThreads = (prof.monitored_threads || []).join(', ');
    }
    this.isEditingProfile.set(!this.isEditingProfile());
  }

  async saveProfile(): Promise<void> {
    const threads = this.inputThreads
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const ok = await this.assistant.saveProfile(
      this.inputEmail,
      this.inputPhone,
      this.inputWhatsapp,
      this.inputMode,
      threads
    );
    if (ok) {
      this.isEditingProfile.set(false);
    }
  }

  onSelectMessage(msg: InboxMessage): void {
    this.assistant.selectMessage(msg);
    this.customReplyText.set('');
  }

  selectReplyOption(text: string): void {
    this.customReplyText.set(text);
  }

  async sendSelectedReply(): Promise<void> {
    const msg = this.assistant.activeMessage();
    const text = this.customReplyText().trim();
    if (!msg || !text) return;
    await this.assistant.sendReply(msg, text);
    this.customReplyText.set('');
  }

  async sendQuickReply(replyText: string): Promise<void> {
    const msg = this.assistant.activeMessage();
    if (!msg || !replyText) return;
    await this.assistant.sendReply(msg, replyText);
  }
}
