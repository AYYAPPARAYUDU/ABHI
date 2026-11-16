import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommunicationsAssistantService, InboxMessage } from '../../../core/services/communications-assistant.service';
import { Brain3dViewerComponent } from '../../../shared/3d/brain-3d-viewer/brain-3d-viewer.component';

@Component({
  selector: 'app-assistant-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, Brain3dViewerComponent],
  templateUrl: './assistant-modal.component.html',
  styleUrl: './assistant-modal.component.css'
})
export class AssistantModalComponent {
  readonly assistant = inject(CommunicationsAssistantService);

  isEditingProfile = signal<boolean>(false);
  inputEmail = '';
  inputPhone = '';
  inputWhatsapp = true;
  inputMode: 'HUMAN_CONFIRMATION' | 'FULLY_AUTONOMOUS' | 'SOVEREIGN_OPERATOR' = 'SOVEREIGN_OPERATOR';
  inputThreads = '';

  customReplyText = signal<string>('');

  readonly filteredMessages = computed(() => {
    return this.assistant.getFilteredInbox();
  });

  toggleEditProfile(): void {
    const prof = this.assistant.profile();
    if (prof) {
      this.inputEmail = prof.email || 'ayyapparayudu.ravuvari@gmail.com';
      this.inputPhone = prof.phone_number || '+91 9390598938';
      this.inputWhatsapp = prof.whatsapp_enabled ?? true;
      this.inputMode = (prof.auto_reply_mode as any) || 'SOVEREIGN_OPERATOR';
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
      this.inputMode as any,
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

  setFilter(filter: 'all' | 'banking' | 'otp' | 'calls' | 'notifications'): void {
    this.assistant.setFilter(filter);
  }

  copyText(text: string, label: string = 'Copied'): void {
    this.assistant.copyToClipboard(text, label);
  }

  syncDevice(): void {
    this.assistant.syncDeviceData();
  }

  dialNumber(phone: string): void {
    this.assistant.executePhoneAction('dial', phone);
  }

  openWhatsApp(phone: string): void {
    this.assistant.executePhoneAction('whatsapp', phone);
  }

  formatAmount(val?: number | null): string {
    if (val == null) return '';
    return '₹' + Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  isDebitMessage(msg: InboxMessage): boolean {
    const b = (msg.body || '').toLowerCase();
    return b.includes('debited') || b.includes('debit') || b.includes('sent') || b.includes('paid');
  }

  isCreditMessage(msg: InboxMessage): boolean {
    const b = (msg.body || '').toLowerCase();
    return b.includes('credited') || b.includes('credit') || b.includes('received') || b.includes('deposited');
  }
}
