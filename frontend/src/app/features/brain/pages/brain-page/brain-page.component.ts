import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommunicationsAssistantService, ContactThread, ThreadMessage } from '../../../../core/services/communications-assistant.service';

@Component({
  selector: 'app-brain-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brain-page.component.html',
  styleUrl: './brain-page.component.css'
})
export class BrainPageComponent implements OnInit, OnDestroy {
  readonly assistant = inject(CommunicationsAssistantService);

  // Search & Filter State
  readonly searchQuery = signal<string>('');
  readonly activeChannel = signal<string>('all');
  readonly chatDraftText = signal<string>('');

  // Right Neural Intelligence Sidebar & Modal Controls
  readonly isRightSidebarOpen = signal<boolean>(true);
  readonly isGooglePasswordModalOpen = signal<boolean>(false);
  readonly isProfileDrawerOpen = signal<boolean>(false);
  readonly inputGooglePassword = signal<string>('');
  readonly aiPromptQuery = signal<string>('');

  // Profile Edit Inputs
  inputEmail = '';
  inputPhone = '';
  inputWhatsapp = true;
  inputMode: 'HUMAN_CONFIRMATION' | 'FULLY_AUTONOMOUS' | 'SOVEREIGN_OPERATOR' = 'SOVEREIGN_OPERATOR';
  inputThreads = '';

  private pollInterval: any = null;

  // Reactive Computed Signals
  readonly contacts = computed(() => this.assistant.contacts());
  readonly activeContact = computed(() => this.assistant.activeContact());
  readonly threadMessages = computed(() => this.assistant.threadMessages());
  readonly summary = computed(() => this.assistant.deviceSummary());

  ngOnInit(): void {
    this.assistant.fetchContacts();
    this.assistant.loadProfile();
    this.assistant.loadBrainStatus();
    this.assistant.loadDailyBriefing();

    // Auto-refresh contacts & messages every 20 seconds
    this.pollInterval = setInterval(() => {
      this.assistant.fetchContacts(this.activeChannel(), this.searchQuery());
    }, 20000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  // Channel & Filter Navigation
  setChannel(channel: string): void {
    this.activeChannel.set(channel);
    this.assistant.fetchContacts(channel, this.searchQuery());
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.assistant.fetchContacts(this.activeChannel(), query);
  }

  onSelectContact(contact: ContactThread): void {
    this.assistant.selectContact(contact);
  }

  // Messaging Actions
  async sendChat(): Promise<void> {
    const text = this.chatDraftText().trim();
    if (!text) return;
    const ok = await this.assistant.sendChatMessage(text);
    if (ok) {
      this.chatDraftText.set('');
    }
  }

  async sendQuickReply(replyText: string): Promise<void> {
    this.chatDraftText.set(replyText);
  }

  // AI & RAG Intelligence
  async askAI(): Promise<void> {
    const q = this.aiPromptQuery().trim();
    if (!q) return;
    await this.assistant.askIntelligence(q);
  }

  triggerThreadSummary(): void {
    const contact = this.activeContact();
    const target = contact ? contact.name : 'my communications';
    const q = `Summarize the recent conversations, promises, and action items with ${target}.`;
    this.aiPromptQuery.set(q);
    this.assistant.askIntelligence(q);
  }

  triggerActionExtraction(): void {
    const contact = this.activeContact();
    const target = contact ? contact.name : 'my messages';
    const q = `Extract all pending tasks, payments, meetings, and follow-ups from ${target}.`;
    this.aiPromptQuery.set(q);
    this.assistant.askIntelligence(q);
  }

  clearAIAnswer(): void {
    this.assistant.clearIntelligenceAnswer();
    this.aiPromptQuery.set('');
  }

  // One-Click Operational Actions
  copyToClipboard(text: string, label: string): void {
    this.assistant.copyToClipboard(text, label);
  }

  callActiveContact(): void {
    const contact = this.activeContact();
    if (contact && contact.handle) {
      this.assistant.callContact(contact.handle);
    }
  }

  openWhatsAppActiveContact(): void {
    const contact = this.activeContact();
    if (contact && contact.handle) {
      this.assistant.openWhatsAppChat(contact.handle);
    } else {
      this.assistant.launchWhatsAppWeb();
    }
  }

  openEmailActiveContact(): void {
    const contact = this.activeContact();
    const to = contact?.handle && contact.handle.includes('@') ? contact.handle : 'ayyapparayudu.ravuvari@gmail.com';
    const encTo = encodeURIComponent(to);
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encTo}&su=Follow-up`, '_blank');
  }

  // Credential Modal & Setup
  openGooglePasswordModal(): void {
    this.inputGooglePassword.set('');
    this.isGooglePasswordModalOpen.set(true);
  }

  closeGooglePasswordModal(): void {
    this.isGooglePasswordModalOpen.set(false);
  }

  async saveGooglePassword(): Promise<void> {
    const pwd = this.inputGooglePassword().trim();
    if (!pwd) return;
    const ok = await this.assistant.saveGoogleAppPassword(pwd);
    if (ok) {
      this.isGooglePasswordModalOpen.set(false);
      this.inputGooglePassword.set('');
    }
  }

  // Profile Drawer
  toggleProfileDrawer(): void {
    const prof = this.assistant.profile();
    if (prof) {
      this.inputEmail = prof.email || 'ayyapparayudu.ravuvari@gmail.com';
      this.inputPhone = prof.phone_number || '+91 9390598938';
      this.inputWhatsapp = prof.whatsapp_enabled ?? true;
      this.inputMode = (prof.auto_reply_mode as any) || 'SOVEREIGN_OPERATOR';
      this.inputThreads = (prof.monitored_threads || []).join(', ');
    }
    this.isProfileDrawerOpen.set(!this.isProfileDrawerOpen());
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
      this.isProfileDrawerOpen.set(false);
    }
  }

  toggleRightSidebar(): void {
    this.isRightSidebarOpen.set(!this.isRightSidebarOpen());
  }
}
