import {
  Component,
  computed,
  inject,
  signal,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { getApiUrl } from '../../../../core/config/api-config';
import {
  ConversationService,
  ConversationSummary,
  ConversationDetail,
  ConversationMessage
} from '../../../../core/services/conversation.service';
import { SpeechVoiceService } from '../../../../core/services/speech-voice.service';
import {
  CommunicationsAssistantService,
  ContactThread,
  ThreadMessage,
  InboxMessage,
  SuggestedReply
} from '../../../../core/services/communications-assistant.service';

export interface ContentBlock {
  type: 'text' | 'code';
  content: string;
  language?: string;
  copied?: boolean;
}

export type ReplyModeType = 'MANUAL' | 'DRAFT' | 'APPROVAL' | 'AUTHORIZED AUTOMATION';

@Component({
  selector: 'app-brain-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brain-page.component.html',
  styleUrl: './brain-page.component.css'
})
export class BrainPageComponent implements OnInit, OnDestroy {
  readonly convService = inject(ConversationService);
  readonly speechVoice = inject(SpeechVoiceService);
  readonly comms = inject(CommunicationsAssistantService);
  private readonly http = inject(HttpClient);

  // Scroll and Input Refs
  @ViewChild('messagesScrollContainer') private scrollContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('composerInput') private composerInput?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('personalScrollContainer') private personalScrollContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('personalComposerInput') private personalComposerInput?: ElementRef<HTMLTextAreaElement>;

  // ==========================================================================
  // TOP-LEVEL WORKSPACE SWITCHER STATE
  // ==========================================================================
  readonly activeWorkspaceTab = signal<'agent-chat' | 'personal-hub'>('agent-chat');

  // ==========================================================================
  // TAB A: ABHI AI & AGENT CHAT STATE
  // ==========================================================================
  readonly searchQuery = signal<string>('');
  readonly showArchived = signal<boolean>(false);
  readonly messageInput = signal<string>('');
  readonly selectedModel = signal<'abhi:latest' | 'qwen3:8b'>('abhi:latest');
  readonly editingTitleId = signal<string | null>(null);
  readonly editingTitleText = signal<string>('');
  readonly isContextDrawerOpen = signal<boolean>(true);

  readonly starterPrompts = [
    {
      title: 'Check System Health',
      subtitle: 'Audit core nodes, SQLite WAL, and daemon vitals',
      prompt: 'Check system health and verify all core daemons, SQLite WAL status, and GPU vitals.'
    },
    {
      title: 'Summarize ABHI Architecture',
      subtitle: 'Inspect 4-tier engine, supervisor, and execution flow',
      prompt: 'Summarize ABHI system architecture and explain the 9-agent autonomous supervisor chain.'
    },
    {
      title: 'Run AST Security Scan',
      subtitle: 'Scan local workspace for safety boundaries & tokens',
      prompt: 'Run an AST security scan on local Python and TypeScript files to verify permission boundaries.'
    }
  ];

  // Reactive Derived Signals from ConversationService
  readonly conversations = computed(() => this.convService.conversations());
  readonly activeConversation = computed(() => this.convService.activeConversation());
  readonly isLoading = computed(() => this.convService.isLoading());
  readonly isStreaming = computed(() => this.convService.isStreaming());
  readonly errorMessage = computed(() => this.convService.errorMessage());

  readonly filteredConversations = computed(() => {
    const list = this.conversations();
    const query = this.searchQuery().toLowerCase().trim();
    const arch = this.showArchived();

    return list.filter(item => {
      const matchArchive = arch ? true : !item.is_archived;
      const matchQuery = !query ||
        item.title.toLowerCase().includes(query) ||
        (item.last_message && item.last_message.toLowerCase().includes(query));
      return matchArchive && matchQuery;
    });
  });

  // ==========================================================================
  // TAB B: PERSONAL COMMUNICATION HUB STATE
  // ==========================================================================
  readonly selectedChannel = signal<'all' | 'whatsapp' | 'gmail' | 'sms' | 'banking' | 'calls'>('all');
  readonly personalSearchQuery = signal<string>('');
  readonly personalMessageInput = signal<string>('');
  readonly isSafeguardsDrawerOpen = signal<boolean>(false);

  // 4 Configurable Reply Modes
  readonly replyMode = signal<ReplyModeType>('DRAFT');

  // Automation Safeguards
  readonly killSwitchActive = signal<boolean>(false);
  readonly quietHoursEnabled = signal<boolean>(true);
  readonly quietHoursStart = signal<string>('22:00');
  readonly quietHoursEnd = signal<string>('07:00');
  readonly sensitiveExclusionsEnabled = signal<boolean>(true);
  readonly rateLimitPerMinute = signal<number>(5);
  readonly whitelistedContacts = signal<string[]>([]);

  // Channel Status and Connection Cards
  readonly channelStatuses = signal<Record<string, any>>({});
  readonly isLoadingChannels = signal<boolean>(false);

  // Approval Queue State (for APPROVAL mode)
  readonly queuedApprovalReply = signal<{
    text: string;
    category: string;
    tone: string;
    targetContact: ContactThread;
  } | null>(null);

  // Personal suggestions & sending
  readonly personalSuggestedReplies = signal<SuggestedReply[]>([]);
  readonly isGeneratingPersonalSuggestions = signal<boolean>(false);
  readonly isSendingPersonal = signal<boolean>(false);
  readonly personalStatusNotice = signal<string | null>(null);

  // Setup Modals
  readonly showGoogleSetupModal = signal<boolean>(false);
  readonly googleAppPasswordInput = signal<string>('');
  readonly showWhatsAppSetupModal = signal<boolean>(false);
  readonly whatsAppPhoneInput = signal<string>('');

  // Tab B Computed Signals
  readonly filteredPersonalContacts = computed(() => {
    const list = this.comms.contacts();
    const ch = this.selectedChannel();
    const q = this.personalSearchQuery().toLowerCase().trim();

    return list.filter(c => {
      // Channel match
      let matchChannel = true;
      if (ch === 'whatsapp') matchChannel = c.channel === 'whatsapp' || c.category === 'whatsapp';
      else if (ch === 'gmail') matchChannel = c.channel === 'gmail' || c.category === 'mail';
      else if (ch === 'sms') matchChannel = c.channel === 'sms' || c.category === 'sms';
      else if (ch === 'banking') matchChannel = c.category === 'banking' || c.channel === 'banking' || c.category === 'otp';
      else if (ch === 'calls') matchChannel = c.category === 'calls' || c.channel === 'call';

      // Search match
      const matchQuery = !q ||
        c.name.toLowerCase().includes(q) ||
        (c.handle && c.handle.toLowerCase().includes(q)) ||
        (c.last_message && c.last_message.toLowerCase().includes(q));

      return matchChannel && matchQuery;
    });
  });

  readonly channelUnreadCounts = computed(() => {
    const all = this.comms.contacts();
    let wa = 0;
    let gmail = 0;
    let sms = 0;
    let bank = 0;
    let calls = 0;

    for (const c of all) {
      const u = c.unread_count || 0;
      if (c.channel === 'whatsapp' || c.category === 'whatsapp') wa += u;
      else if (c.channel === 'gmail' || c.category === 'mail') gmail += u;
      else if (c.channel === 'sms' || c.category === 'sms') sms += u;
      else if (c.category === 'banking' || c.channel === 'banking' || c.category === 'otp') bank += u;
      else if (c.category === 'calls' || c.channel === 'call') calls += u;
    }

    return { total: wa + gmail + sms + bank + calls, wa, gmail, sms, bank, calls };
  });

  readonly isSelectedChannelConfigured = computed(() => {
    const ch = this.selectedChannel();
    const status = this.channelStatuses();
    if (!status || Object.keys(status).length === 0) return true;

    if (ch === 'gmail') {
      return status['gmail']?.configured ?? true;
    }
    if (ch === 'whatsapp') {
      return status['whatsapp']?.configured ?? true;
    }
    return true;
  });

  constructor() {
    // Auto-scroll when messages update in Tab A
    effect(() => {
      const active = this.activeConversation();
      const streaming = this.isStreaming();
      if (active || streaming) {
        setTimeout(() => this.scrollToBottom(), 50);
      }
    });

    // Auto-scroll when messages update in Tab B
    effect(() => {
      const msgs = this.comms.threadMessages();
      if (msgs.length > 0) {
        setTimeout(() => this.scrollPersonalToBottom(), 50);
      }
    });
  }

  ngOnInit(): void {
    this.convService.fetchConversations('', this.showArchived());
    this.loadSafeguards();
    this.loadChannelStatuses();
    this.comms.fetchContacts();
    this.comms.fetchInbox();
  }

  ngOnDestroy(): void {
    if (this.speechVoice.isListening()) {
      this.speechVoice.stopVoiceListening();
    }
  }

  // ==========================================================================
  // WORKSPACE SWITCHER ACTION
  // ==========================================================================
  setWorkspaceTab(tab: 'agent-chat' | 'personal-hub'): void {
    this.activeWorkspaceTab.set(tab);
    if (tab === 'personal-hub') {
      this.loadChannelStatuses();
      this.loadSafeguards();
      if (!this.comms.activeContact() && this.comms.contacts().length > 0) {
        this.selectPersonalContact(this.comms.contacts()[0]);
      }
    }
  }

  // ==========================================================================
  // TAB A: CONVERSATION ACTIONS
  // ==========================================================================
  async onNewChat(): Promise<void> {
    await this.convService.createConversation('New Discussion', this.selectedModel());
    this.editingTitleId.set(null);
    setTimeout(() => {
      this.composerInput?.nativeElement?.focus();
    }, 100);
  }

  onSelectConversation(convo: ConversationSummary): void {
    this.editingTitleId.set(null);
    this.convService.selectConversation(convo.id);
  }

  onSearchChange(term: string): void {
    this.searchQuery.set(term);
  }

  toggleArchivedFilter(): void {
    const nextVal = !this.showArchived();
    this.showArchived.set(nextVal);
    this.convService.fetchConversations(this.searchQuery(), nextVal);
  }

  startRename(convo: ConversationSummary | ConversationDetail, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.editingTitleId.set(convo.id);
    this.editingTitleText.set(convo.title);
  }

  async saveRename(id: string): Promise<void> {
    const newTitle = this.editingTitleText().trim();
    if (newTitle) {
      await this.convService.renameConversation(id, newTitle);
    }
    this.editingTitleId.set(null);
  }

  cancelRename(): void {
    this.editingTitleId.set(null);
  }

  async toggleArchive(convo: ConversationSummary | ConversationDetail, event?: MouseEvent): Promise<void> {
    if (event) {
      event.stopPropagation();
    }
    await this.convService.archiveConversation(convo.id, !convo.is_archived);
  }

  async onDeleteConversation(id: string, event?: MouseEvent): Promise<void> {
    if (event) {
      event.stopPropagation();
    }
    await this.convService.deleteConversation(id);
  }

  async sendMessage(): Promise<void> {
    const text = this.messageInput().trim();
    if (!text || this.isStreaming()) return;

    let active = this.activeConversation();
    if (!active) {
      active = await this.convService.createConversation('New Discussion', this.selectedModel());
    }

    this.messageInput.set('');
    this.adjustTextareaHeight();
    await this.convService.sendMessage(active.id, text, this.selectedModel());
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onInputText(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.messageInput.set(target.value);
    this.adjustTextareaHeight();
  }

  private adjustTextareaHeight(): void {
    if (!this.composerInput?.nativeElement) return;
    const el = this.composerInput.nativeElement;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }

  stopGeneration(): void {
    this.convService.stopGeneration();
  }

  setModel(model: 'abhi:latest' | 'qwen3:8b'): void {
    this.selectedModel.set(model);
  }

  selectStarterPrompt(prompt: string): void {
    this.messageInput.set(prompt);
    this.sendMessage();
  }

  toggleVoiceInput(): void {
    if (this.speechVoice.isListening()) {
      this.speechVoice.stopVoiceListening();
    } else {
      this.speechVoice.startVoiceListening((transcript: string) => {
        if (transcript) {
          const current = this.messageInput();
          const separator = current && !current.endsWith(' ') ? ' ' : '';
          this.messageInput.set(`${current}${separator}${transcript}`);
          this.adjustTextareaHeight();
        }
      });
    }
  }

  toggleContextDrawer(): void {
    this.isContextDrawerOpen.set(!this.isContextDrawerOpen());
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer?.nativeElement) {
        const el = this.scrollContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    } catch {
      // Ignore scroll errors
    }
  }

  parseMessageContent(raw: string): ContentBlock[] {
    if (!raw) return [];

    const blocks: ContentBlock[] = [];
    const codeBlockRegex = /```([a-zA-Z0-9_\-\+]*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(raw)) !== null) {
      if (match.index > lastIndex) {
        const textChunk = raw.substring(lastIndex, match.index);
        if (textChunk.trim()) {
          blocks.push({ type: 'text', content: textChunk });
        }
      }

      blocks.push({
        type: 'code',
        language: match[1]?.trim() || 'plaintext',
        content: match[2]?.trimEnd() || '',
        copied: false
      });

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < raw.length) {
      const remaining = raw.substring(lastIndex);
      if (remaining.trim()) {
        blocks.push({ type: 'text', content: remaining });
      }
    }

    return blocks.length > 0 ? blocks : [{ type: 'text', content: raw }];
  }

  copyCode(code: string, block: ContentBlock): void {
    if (!code) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        block.copied = true;
        setTimeout(() => {
          block.copied = false;
        }, 2200);
      });
    }
  }

  formatTimestamp(epochMs: number): string {
    if (!epochMs) return '';
    const date = new Date(epochMs);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) {
      return timeStr;
    }
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${timeStr}`;
  }

  // ==========================================================================
  // TAB B: PERSONAL COMMUNICATION HUB ACTIONS
  // ==========================================================================

  selectChannelFilter(channel: 'all' | 'whatsapp' | 'gmail' | 'sms' | 'banking' | 'calls'): void {
    this.selectedChannel.set(channel);
    const filtered = this.filteredPersonalContacts();
    if (filtered.length > 0) {
      this.selectPersonalContact(filtered[0]);
    }
  }

  async selectPersonalContact(contact: ContactThread): Promise<void> {
    await this.comms.selectContact(contact);
    this.personalMessageInput.set('');
    this.queuedApprovalReply.set(null);
    this.generatePersonalSuggestions(contact);
  }

  async generatePersonalSuggestions(contact: ContactThread): Promise<void> {
    if (!contact) return;
    this.isGeneratingPersonalSuggestions.set(true);
    try {
      const url = getApiUrl('/api/v1/assistant/messages/suggest-reply');
      const payload = {
        contact_id: contact.contact_id,
        sender: contact.name,
        content: contact.last_message || `Hello from ${contact.name}`,
        channel: contact.channel,
        context: contact.category || 'Personal communication'
      };
      const res: any = await firstValueFrom(this.http.post(url, payload));
      if (res && res.success && Array.isArray(res.replies)) {
        this.personalSuggestedReplies.set(res.replies);

        // In DRAFT mode, if no message typed yet, pre-fill option 1
        if (this.replyMode() === 'DRAFT' && !this.personalMessageInput()) {
          this.personalMessageInput.set(res.replies[0]?.text || '');
        }
      }
    } catch (e) {
      console.error('Failed to generate suggestions', e);
    } finally {
      this.isGeneratingPersonalSuggestions.set(false);
    }
  }

  applySuggestedReply(reply: SuggestedReply): void {
    const contact = this.comms.activeContact();
    if (!contact) return;

    const mode = this.replyMode();

    if (mode === 'APPROVAL') {
      // In APPROVAL mode, queue reply for operator review
      this.queuedApprovalReply.set({
        text: reply.text,
        category: reply.category,
        tone: reply.tone,
        targetContact: contact
      });
      this.setPersonalNotice('Reply queued for Operator Approval. Click "Approve & Dispatch" to send.');
    } else if (mode === 'AUTHORIZED AUTOMATION') {
      // In AUTHORIZED AUTOMATION, if contact is whitelisted, directly dispatch
      if (this.isContactWhitelisted(contact.contact_id) || this.isContactWhitelisted(contact.name)) {
        this.dispatchReplyDirectly(contact, reply.text, true);
      } else {
        // Not whitelisted -> fallback to approval
        this.queuedApprovalReply.set({
          text: reply.text,
          category: reply.category,
          tone: reply.tone,
          targetContact: contact
        });
        this.setPersonalNotice(`Contact not on whitelist. Queued for Operator Approval.`);
      }
    } else {
      // DRAFT or MANUAL mode -> pre-fill composer for 1-click editing
      this.personalMessageInput.set(reply.text);
      if (this.personalComposerInput?.nativeElement) {
        this.personalComposerInput.nativeElement.focus();
      }
    }
  }

  async approveQueuedReply(): Promise<void> {
    const queued = this.queuedApprovalReply();
    if (!queued) return;

    await this.dispatchReplyDirectly(queued.targetContact, queued.text, false);
    this.queuedApprovalReply.set(null);
  }

  rejectQueuedReply(): void {
    this.queuedApprovalReply.set(null);
    this.setPersonalNotice('Suggested reply dismissed.');
  }

  editQueuedReply(): void {
    const queued = this.queuedApprovalReply();
    if (queued) {
      this.personalMessageInput.set(queued.text);
      this.queuedApprovalReply.set(null);
      if (this.personalComposerInput?.nativeElement) {
        this.personalComposerInput.nativeElement.focus();
      }
    }
  }

  async sendPersonalMessage(): Promise<void> {
    const contact = this.comms.activeContact();
    const text = this.personalMessageInput().trim();
    if (!contact || !text) return;

    if (this.killSwitchActive()) {
      this.setPersonalNotice('🚨 Cannot send: Emergency Kill Switch is ACTIVE!');
      return;
    }

    await this.dispatchReplyDirectly(contact, text, false);
    this.personalMessageInput.set('');
  }

  private async dispatchReplyDirectly(contact: ContactThread, message: string, autoDispatch: boolean): Promise<void> {
    this.isSendingPersonal.set(true);
    try {
      const url = getApiUrl('/api/v1/assistant/messages/send');
      const payload = {
        contact_id: contact.contact_id,
        recipient: contact.handle || contact.name,
        message: message.trim(),
        channel: contact.channel,
        subject: `Message to ${contact.name}`,
        auto_dispatch: autoDispatch
      };

      const res: any = await firstValueFrom(this.http.post(url, payload));
      if (res && res.success) {
        const newMsg: ThreadMessage = {
          direction: 'outgoing',
          sender: 'Mamu',
          body: message.trim(),
          timestamp: new Date().toISOString(),
          status: 'delivered',
          channel: contact.channel
        };
        this.comms.threadMessages.update(msgs => [...msgs, newMsg]);
        contact.last_message = message.trim();
        contact.last_timestamp = newMsg.timestamp;
        this.setPersonalNotice(`Message dispatched to ${contact.name} via ${contact.channel.toUpperCase()}!`);
      } else {
        this.setPersonalNotice(`Dispatch failed: ${res?.detail || 'Channel error'}`);
      }
    } catch (e: any) {
      const errDetail = e?.error?.detail || e?.message || 'Error dispatching message';
      this.setPersonalNotice(`Blocked: ${errDetail}`);
    } finally {
      this.isSendingPersonal.set(false);
    }
  }

  onPersonalKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendPersonalMessage();
    }
  }

  // --------------------------------------------------------------------------
  // SAFEGUARDS & REPLY MODES
  // ----------------------------------------------------------------=========
  async loadSafeguards(): Promise<void> {
    try {
      const url = getApiUrl('/api/v1/assistant/safeguards');
      const res: any = await firstValueFrom(this.http.get(url));
      if (res && res.success && res.safeguards) {
        const sg = res.safeguards;
        this.replyMode.set(sg.reply_mode || 'DRAFT');
        this.killSwitchActive.set(!!sg.kill_switch_active);
        this.quietHoursEnabled.set(!!sg.quiet_hours_enabled);
        this.quietHoursStart.set(sg.quiet_hours_start || '22:00');
        this.quietHoursEnd.set(sg.quiet_hours_end || '07:00');
        this.sensitiveExclusionsEnabled.set(!!sg.sensitive_exclusions_enabled);
        this.rateLimitPerMinute.set(sg.rate_limit_per_minute || 5);
        this.whitelistedContacts.set(sg.whitelisted_contacts || []);
      }
    } catch (e) {
      console.debug('Safeguards load fallback', e);
    }
  }

  async saveSafeguards(): Promise<void> {
    try {
      const url = getApiUrl('/api/v1/assistant/safeguards');
      const payload = {
        reply_mode: this.replyMode(),
        kill_switch_active: this.killSwitchActive(),
        quiet_hours_enabled: this.quietHoursEnabled(),
        quiet_hours_start: this.quietHoursStart(),
        quiet_hours_end: this.quietHoursEnd(),
        sensitive_exclusions_enabled: this.sensitiveExclusionsEnabled(),
        rate_limit_per_minute: this.rateLimitPerMinute(),
        whitelisted_contacts: this.whitelistedContacts()
      };
      await firstValueFrom(this.http.post(url, payload));
      this.setPersonalNotice('Safeguards and automation rules updated successfully.');
    } catch (e) {
      console.error('Failed to save safeguards', e);
      this.setPersonalNotice('Error saving safeguards configuration.');
    }
  }

  setReplyMode(mode: ReplyModeType): void {
    this.replyMode.set(mode);
    this.saveSafeguards();
    this.setPersonalNotice(`Active Reply Mode switched to: ${mode}`);
  }

  toggleKillSwitch(): void {
    const nextVal = !this.killSwitchActive();
    this.killSwitchActive.set(nextVal);
    this.saveSafeguards();
    if (nextVal) {
      this.setPersonalNotice('🚨 EMERGENCY KILL SWITCH ENGAGED! All outbound communication is instantly paused.');
    } else {
      this.setPersonalNotice('🛡️ Kill Switch Disengaged. Communication channels restored.');
    }
  }

  toggleQuietHours(): void {
    this.quietHoursEnabled.set(!this.quietHoursEnabled());
    this.saveSafeguards();
  }

  toggleSensitiveExclusions(): void {
    this.sensitiveExclusionsEnabled.set(!this.sensitiveExclusionsEnabled());
    this.saveSafeguards();
  }

  toggleSafeguardsDrawer(): void {
    this.isSafeguardsDrawerOpen.set(!this.isSafeguardsDrawerOpen());
  }

  isContactWhitelisted(idOrName: string): boolean {
    return this.whitelistedContacts().includes(idOrName);
  }

  toggleWhitelistContact(idOrName: string): void {
    const list = [...this.whitelistedContacts()];
    const idx = list.indexOf(idOrName);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push(idOrName);
    }
    this.whitelistedContacts.set(list);
    this.saveSafeguards();
  }

  // --------------------------------------------------------------------------
  // CHANNEL READINESS & CONFIGURATION CARDS
  // -------------------------------------------------------------------------
  async loadChannelStatuses(): Promise<void> {
    this.isLoadingChannels.set(true);
    try {
      const url = getApiUrl('/api/v1/assistant/channels/status');
      const res: any = await firstValueFrom(this.http.get(url));
      if (res && res.success && res.channels) {
        this.channelStatuses.set(res.channels);
      }
    } catch (e) {
      console.debug('Failed to query channels status', e);
    } finally {
      this.isLoadingChannels.set(false);
    }
  }

  openGoogleSetupModal(): void {
    this.googleAppPasswordInput.set('');
    this.showGoogleSetupModal.set(true);
  }

  closeGoogleSetupModal(): void {
    this.showGoogleSetupModal.set(false);
  }

  async saveGooglePassword(): Promise<void> {
    const pwd = this.googleAppPasswordInput().trim();
    if (!pwd) return;

    const ok = await this.comms.saveGoogleAppPassword(pwd);
    if (ok) {
      this.closeGoogleSetupModal();
      await this.loadChannelStatuses();
      this.setPersonalNotice('Gmail App Password configured and live sync engaged.');
    }
  }

  openWhatsAppSetupModal(): void {
    this.whatsAppPhoneInput.set(this.comms.profile()?.phone_number || '+91 9390598938');
    this.showWhatsAppSetupModal.set(true);
  }

  closeWhatsAppSetupModal(): void {
    this.showWhatsAppSetupModal.set(false);
  }

  async saveWhatsAppPhone(): Promise<void> {
    const phone = this.whatsAppPhoneInput().trim();
    if (!phone) return;

    try {
      const url = getApiUrl('/api/v1/assistant/credentials/whatsapp');
      await firstValueFrom(this.http.post(url, { phone_number: phone }));
      this.closeWhatsAppSetupModal();
      await this.loadChannelStatuses();
      this.setPersonalNotice(`WhatsApp registered for ${phone}.`);
    } catch (e) {
      console.error('WhatsApp save error', e);
    }
  }

  async launchWhatsAppWeb(): Promise<void> {
    await this.comms.launchWhatsAppWeb();
  }

  async launchWhatsAppDesktop(): Promise<void> {
    await this.comms.launchWhatsAppDesktop();
  }

  async dialContact(phone?: string): Promise<void> {
    if (!phone) return;
    await this.comms.callContact(phone);
  }

  async openWhatsAppChat(phone?: string): Promise<void> {
    if (!phone) return;
    await this.comms.openWhatsAppChat(phone);
  }

  async copyText(text: string, label: string = 'Copied'): Promise<void> {
    await this.comms.copyToClipboard(text, label);
  }

  async syncMobileDevice(): Promise<void> {
    await this.comms.syncDeviceData();
    await this.loadChannelStatuses();
  }

  private setPersonalNotice(msg: string): void {
    this.personalStatusNotice.set(msg);
    setTimeout(() => {
      if (this.personalStatusNotice() === msg) {
        this.personalStatusNotice.set(null);
      }
    }, 4500);
  }

  private scrollPersonalToBottom(): void {
    try {
      if (this.personalScrollContainer?.nativeElement) {
        const el = this.personalScrollContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    } catch {
      // Ignore scroll errors
    }
  }

  formatMessageTime(isoStr?: string): string {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return isoStr;
    }
  }
}
