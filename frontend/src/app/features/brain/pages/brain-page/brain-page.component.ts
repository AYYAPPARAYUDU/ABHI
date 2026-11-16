import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommunicationsAssistantService, InboxMessage } from '../../../../core/services/communications-assistant.service';

@Component({
  selector: 'app-brain-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brain-page.component.html',
  styleUrl: './brain-page.component.css'
})
export class BrainPageComponent implements OnInit, OnDestroy {
  readonly assistant = inject(CommunicationsAssistantService);

  isEditingProfile = signal<boolean>(false);
  inputEmail = '';
  inputPhone = '';
  inputWhatsapp = true;
  inputMode: 'HUMAN_CONFIRMATION' | 'FULLY_AUTONOMOUS' | 'SOVEREIGN_OPERATOR' = 'SOVEREIGN_OPERATOR';
  inputThreads = '';

  customReplyText = signal<string>('');
  userQuery = signal<string>('');

  private pollInterval: any = null;

  readonly filteredMessages = computed(() => {
    return this.assistant.getFilteredInbox();
  });

  readonly summary = computed(() => {
    return this.assistant.deviceSummary();
  });

  ngOnInit(): void {
    this.assistant.fetchInbox();
    this.assistant.loadProfile();
    this.assistant.loadBrainStatus();
    this.assistant.loadDailyBriefing();

    // Auto-refresh every 25 seconds for live background sync updates
    this.pollInterval = setInterval(() => {
      this.assistant.fetchInbox();
    }, 25000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  triggerDailyBriefing(): void {
    this.userQuery.set('Give me my full daily executive briefing: basic summary of messages, mails and calls, then important alerts and specific actions.');
    this.assistant.loadDailyBriefing();
    this.assistant.askIntelligence('Give me my full daily executive briefing: basic summary of messages, mails and calls, then important alerts and specific actions.');
  }

  sendQuickQuery(q: string): void {
    this.userQuery.set(q);
    this.assistant.askIntelligence(q);
  }

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

  setFilter(filter: 'all' | 'banking' | 'otp' | 'calls' | 'mail' | 'whatsapp' | 'notifications'): void {
    this.assistant.setFilter(filter);
  }

  async askAI(): Promise<void> {
    const q = this.userQuery().trim();
    if (!q) return;
    await this.assistant.askIntelligence(q);
  }

  clearAIAnswer(): void {
    this.assistant.clearIntelligenceAnswer();
    this.userQuery.set('');
  }

  openEmail(to: string, subject: string = 'Re: Information'): void {
    const encTo = encodeURIComponent(to);
    const encSubj = encodeURIComponent(subject);
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encTo}&su=${encSubj}`, '_blank');
  }

  launchWhatsAppForMessage(msg: InboxMessage): void {
    const contact = msg.sender.replace(/[^\d+]/g, '');
    if (contact) {
      this.assistant.executePhoneAction('whatsapp', contact);
    } else {
      this.assistant.launchWhatsAppWeb();
    }
  }

  dialPhone(phone: string): void {
    const clean = phone.replace(/[^\d+]/g, '');
    if (clean) {
      this.assistant.executePhoneAction('dial', clean);
    }
  }
}
