import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { getApiUrl } from '../config/api-config';

export interface CommunicationsProfile {
  operator_name?: string;
  email: string | null;
  phone_number: string | null;
  whatsapp_enabled: boolean;
  auto_reply_mode: 'HUMAN_CONFIRMATION' | 'FULLY_AUTONOMOUS' | 'SOVEREIGN_OPERATOR' | string;
  monitored_threads: string[];
  updated_at?: string | null;
  sbi_account?: string;
  sbi_upi?: string;
  connected_device?: any;
  battery?: any;
}

export interface InboxMessage {
  message_id: string;
  channel: 'whatsapp' | 'gmail' | 'sms' | string;
  sender: string;
  recipient: string;
  subject?: string;
  body: string;
  timestamp: string;
  reply_status: 'pending' | 'suggested' | 'replied' | 'verified' | string;
  suggested_replies?: SuggestedReply[];
  selected_reply?: string;
  sent_at?: string;
  category?: 'all' | 'banking' | 'otp' | 'calls' | 'sms' | 'notifications' | string;
  amount_inr?: number | null;
  utr?: string | null;
  otp_code?: string | null;
  account?: string | null;
}

export interface SuggestedReply {
  category: string;
  tone: string;
  text: string;
}

export interface BrainStatus {
  version: string;
  alignment_score: number;
  system_prompt: string;
  temperature: number;
  empathy_bias: number;
  conciseness_ratio: number;
  reasoning_depth: string;
  autonomous_threshold: number;
  updated_at: string;
}

export interface BrainUpgradeRecord {
  upgrade_id: string;
  from_version: string;
  to_version: string;
  alignment_score: number;
  decisions_evaluated: number;
  parameter_diff: Record<string, any>;
  upgrade_rationale: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class CommunicationsAssistantService {
  private readonly http = inject(HttpClient);

  readonly profile = signal<CommunicationsProfile | null>(null);
  readonly isConfigured = signal<boolean>(false);
  readonly inbox = signal<InboxMessage[]>([]);
  readonly activeMessage = signal<InboxMessage | null>(null);
  readonly suggestedReplies = signal<SuggestedReply[]>([]);
  readonly brainStatus = signal<BrainStatus | null>(null);
  readonly upgradeHistory = signal<BrainUpgradeRecord[]>([]);
  readonly lastUpgradeDiff = signal<any>(null);

  readonly deviceSummary = signal<any>({
    total: 0,
    banking: 0,
    otps: 0,
    calls: 0,
    missed_calls: 0,
    emails: 0,
    whatsapp: 0,
    notifications: 0,
    mobile_connected: true,
    fallback_active: false,
    device: { model: 'POCO 22101320I', connected: true },
    battery: { level: 14, status: 'Discharging' },
    endpoint: '10.65.249.121:5555'
  });
  readonly activeFilter = signal<'all' | 'banking' | 'otp' | 'calls' | 'mail' | 'whatsapp' | 'notifications'>('all');

  readonly dailyBriefing = signal<any | null>(null);
  readonly isBriefingLoading = signal<boolean>(false);

  readonly intelligenceAnswer = signal<any | null>(null);
  readonly isAskingAI = signal<boolean>(false);

  readonly isLoading = signal<boolean>(false);
  readonly isSyncing = signal<boolean>(false);
  readonly isGeneratingReplies = signal<boolean>(false);
  readonly isSendingReply = signal<boolean>(false);
  readonly isUpgradingBrain = signal<boolean>(false);
  readonly isModalOpen = signal<boolean>(false);
  readonly notificationAlert = signal<string | null>(null);

  constructor() {
    this.initData();
  }

  async initData(): Promise<void> {
    await Promise.all([
      this.loadProfile(),
      this.fetchInbox(),
      this.loadBrainStatus()
    ]);
  }

  openModal(): void {
    this.isModalOpen.set(true);
    this.fetchInbox();
    this.loadProfile();
    this.loadBrainStatus();
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  async loadProfile(): Promise<void> {
    try {
      const url = getApiUrl('/api/v1/assistant/profile');
      const res: any = await firstValueFrom(this.http.get(url));
      if (res && res.success) {
        this.profile.set(res.profile);
        this.isConfigured.set(!!res.is_configured);
      }
    } catch (e) {
      console.error('Failed to load communications profile', e);
    }
  }

  async saveProfile(
    email: string,
    phone: string,
    whatsappEnabled: boolean = true,
    autoReplyMode: 'HUMAN_CONFIRMATION' | 'FULLY_AUTONOMOUS' | 'SOVEREIGN_OPERATOR' = 'SOVEREIGN_OPERATOR',
    monitoredThreads: string[] = []
  ): Promise<boolean> {
    this.isLoading.set(true);
    try {
      const url = getApiUrl('/api/v1/assistant/profile');
      const payload = {
        email: email.trim(),
        phone_number: phone.trim(),
        whatsapp_enabled: whatsappEnabled,
        auto_reply_mode: autoReplyMode,
        monitored_threads: monitoredThreads
      };
      const res: any = await firstValueFrom(this.http.post(url, payload));
      if (res && res.success) {
        this.profile.set(res.profile);
        this.isConfigured.set(!!res.is_configured);
        this.setAlert('Communications profile configured successfully!');
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to save profile', e);
      this.setAlert('Error saving communications profile.');
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async fetchInbox(): Promise<void> {
    try {
      const url = getApiUrl('/api/v1/assistant/messages/inbox?limit=80');
      const res: any = await firstValueFrom(this.http.get(url));
      if (res && res.success && Array.isArray(res.messages)) {
        this.inbox.set(res.messages);
        if (res.summary) {
          this.deviceSummary.set(res.summary);
        }
        if (res.messages.length > 0 && !this.activeMessage()) {
          this.selectMessage(res.messages[0]);
        }
      }
    } catch (e) {
      console.error('Failed to fetch communications inbox', e);
    }
  }

  setFilter(filter: 'all' | 'banking' | 'otp' | 'calls' | 'mail' | 'whatsapp' | 'notifications'): void {
    this.activeFilter.set(filter);
    const msgs = this.getFilteredInbox();
    if (msgs.length > 0 && (!this.activeMessage() || !msgs.some(m => m.message_id === this.activeMessage()?.message_id))) {
      this.selectMessage(msgs[0]);
    }
  }

  getFilteredInbox(): InboxMessage[] {
    const filter = this.activeFilter();
    const all = this.inbox();
    if (filter === 'all') return all;
    if (filter === 'banking') return all.filter(m => m.category === 'banking' || m.amount_inr != null || !!m.utr);
    if (filter === 'otp') return all.filter(m => m.category === 'otp' || !!m.otp_code);
    if (filter === 'calls') return all.filter(m => m.category === 'calls' || m.channel === 'call');
    if (filter === 'mail') return all.filter(m => m.category === 'mail' || m.channel === 'gmail' || m.channel === 'email');
    if (filter === 'whatsapp') return all.filter(m => m.category === 'whatsapp' || m.channel === 'whatsapp');
    if (filter === 'notifications') return all.filter(m => m.category === 'notifications');
    return all;
  }

  async loadDailyBriefing(): Promise<any> {
    this.isBriefingLoading.set(true);
    try {
      const url = getApiUrl('/api/v1/assistant/daily-briefing');
      const res: any = await firstValueFrom(this.http.get(url));
      if (res && res.success) {
        this.dailyBriefing.set(res);
        return res;
      }
      return null;
    } catch (e) {
      console.error('Failed to load daily executive briefing', e);
      return null;
    } finally {
      this.isBriefingLoading.set(false);
    }
  }

  async launchWhatsAppWeb(): Promise<void> {
    try {
      const url = getApiUrl('/api/v1/assistant/messages/action');
      await firstValueFrom(this.http.post(url, { action: 'whatsapp_web' }));
      this.setAlert('WhatsApp Web initiated in browser.');
    } catch {
      window.open('https://web.whatsapp.com', '_blank');
    }
  }

  async launchWhatsAppDesktop(): Promise<void> {
    try {
      const url = getApiUrl('/api/v1/assistant/messages/action');
      await firstValueFrom(this.http.post(url, { action: 'whatsapp_desktop' }));
      this.setAlert('WhatsApp Desktop summoned.');
    } catch {
      window.open('https://web.whatsapp.com', '_blank');
    }
  }

  async askIntelligence(query: string): Promise<any> {
    if (!query.trim()) return null;
    this.isAskingAI.set(true);
    try {
      const url = getApiUrl('/api/v1/assistant/query-intelligence');
      const res: any = await firstValueFrom(this.http.post(url, { query }));
      if (res && res.success) {
        this.intelligenceAnswer.set(res);
        if (res.is_daily_briefing && res.briefing_data) {
          this.dailyBriefing.set(res.briefing_data);
        }
        return res;
      }
      return null;
    } catch (e) {
      console.error('Failed to query communications intelligence', e);
      this.setAlert('Intelligence retrieval error.');
      return null;
    } finally {
      this.isAskingAI.set(false);
    }
  }

  clearIntelligenceAnswer(): void {
    this.intelligenceAnswer.set(null);
  }

  async copyToClipboard(text: string, label: string = 'Copied'): Promise<void> {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      this.setAlert(`${label}: ${text}`);
    } catch {
      this.setAlert(`${label}: ${text}`);
    }
  }

  async syncDeviceData(): Promise<void> {
    this.isSyncing.set(true);
    try {
      const url = getApiUrl('/api/v1/assistant/messages/action');
      const res: any = await firstValueFrom(this.http.post(url, { action: 'sync' }));
      if (res && res.success) {
        this.setAlert(res.message || 'Mobile device communications synchronized.');
        await this.fetchInbox();
        await this.loadProfile();
      }
    } catch (e) {
      console.error('Sync failed', e);
      this.setAlert('Device synchronization encountered an error.');
    } finally {
      this.isSyncing.set(false);
    }
  }

  async executePhoneAction(action: 'dial' | 'whatsapp', phone: string, message?: string): Promise<boolean> {
    try {
      const url = getApiUrl('/api/v1/assistant/messages/action');
      const res: any = await firstValueFrom(this.http.post(url, { action, phone, message }));
      if (res && res.success) {
        this.setAlert(res.message || `Action dispatched on POCO mobile.`);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Phone action failed', e);
      return false;
    }
  }

  selectMessage(msg: InboxMessage): void {
    this.activeMessage.set(msg);
    if (msg.suggested_replies && msg.suggested_replies.length === 3) {
      this.suggestedReplies.set(msg.suggested_replies);
    } else {
      this.generateSuggestions(msg);
    }
  }

  async generateSuggestions(target?: InboxMessage): Promise<void> {
    const msg = target || this.activeMessage();
    if (!msg) return;

    this.isGeneratingReplies.set(true);
    try {
      const url = getApiUrl('/api/v1/assistant/messages/suggest-reply');
      const payload = {
        message_id: msg.message_id,
        sender: msg.sender,
        content: msg.body,
        channel: msg.channel,
        context: msg.subject || 'Personal and work communications'
      };
      const res: any = await firstValueFrom(this.http.post(url, payload));
      if (res && res.success && Array.isArray(res.replies)) {
        this.suggestedReplies.set(res.replies);

        // Update local message state
        const updated = this.inbox().map(m =>
          m.message_id === msg.message_id
            ? { ...m, reply_status: 'suggested', suggested_replies: res.replies }
            : m
        );
        this.inbox.set(updated);
        if (this.activeMessage()?.message_id === msg.message_id) {
          this.activeMessage.set({ ...msg, reply_status: 'suggested', suggested_replies: res.replies });
        }
      }
    } catch (e) {
      console.error('Failed to generate suggested replies', e);
    } finally {
      this.isGeneratingReplies.set(false);
    }
  }

  async sendReply(msg: InboxMessage, replyText: string): Promise<boolean> {
    this.isSendingReply.set(true);
    try {
      const url = getApiUrl('/api/v1/assistant/messages/send');
      const payload = {
        message_id: msg.message_id,
        channel: msg.channel,
        recipient: msg.sender,
        message: replyText,
        subject: `Re: ${msg.subject || 'Message'}`
      };
      const res: any = await firstValueFrom(this.http.post(url, payload));
      if (res && res.success) {
        this.setAlert(`Reply dispatched to ${msg.sender} via ${msg.channel.toUpperCase()}!`);

        // Update message state locally
        const updated = this.inbox().map(m =>
          m.message_id === msg.message_id
            ? { ...m, reply_status: 'replied', selected_reply: replyText, sent_at: new Date().toISOString() }
            : m
        );
        this.inbox.set(updated);
        if (this.activeMessage()?.message_id === msg.message_id) {
          this.activeMessage.set({
            ...msg,
            reply_status: 'replied',
            selected_reply: replyText,
            sent_at: new Date().toISOString()
          });
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to send reply', e);
      this.setAlert('Dispatch encountered an error. Check device connection.');
      return false;
    } finally {
      this.isSendingReply.set(false);
    }
  }

  async loadBrainStatus(): Promise<void> {
    try {
      const url = getApiUrl('/api/v1/assistant/brain/status');
      const res: any = await firstValueFrom(this.http.get(url));
      if (res && res.success) {
        this.brainStatus.set(res.active_brain);
        if (Array.isArray(res.upgrade_history)) {
          this.upgradeHistory.set(res.upgrade_history);
        }
      }
    } catch (e) {
      console.error('Failed to load brain status', e);
    }
  }

  async evaluateAndUpgradeBrain(): Promise<boolean> {
    this.isUpgradingBrain.set(true);
    try {
      const url = getApiUrl('/api/v1/assistant/brain/evaluate-and-upgrade');
      const res: any = await firstValueFrom(this.http.post(url, { eval_window_hours: 24 }));
      if (res && res.success) {
        this.lastUpgradeDiff.set(res.parameter_diff);
        this.setAlert(`Brain upgraded to ${res.to_version}! Alignment: ${(res.alignment_score * 100).toFixed(1)}%`);
        await this.loadBrainStatus();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to evaluate and upgrade brain', e);
      this.setAlert('Brain self-evaluation loop error.');
      return false;
    } finally {
      this.isUpgradingBrain.set(false);
    }
  }

  private setAlert(msg: string): void {
    this.notificationAlert.set(msg);
    setTimeout(() => {
      if (this.notificationAlert() === msg) {
        this.notificationAlert.set(null);
      }
    }, 4500);
  }
}
