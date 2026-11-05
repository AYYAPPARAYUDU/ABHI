import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SpeechVoiceService } from '../../../../core/services/speech-voice.service';
import { getApiUrl } from '../../../../core/config/api-config';

interface SwarmDialogueItem {
  id: string;
  sender_id: string;
  sender_name: string;
  recipient: string;
  sentiment: string;
  message: string;
  timestamp: number;
}

interface CodeUpdateItem {
  id: string;
  file: string;
  summary: string;
  diff?: string;
  author: string;
  timestamp: number;
  time_formatted: string;
}

interface SquadMessage {
  id: string;
  channel: string;
  sender_name: string;
  suit_mark: string;
  role: string;
  message: string;
  code_snippet?: string;
  sentiment: string;
  timestamp: number;
}

interface AgentEvaluation {
  agent_id: string;
  agent_name: string;
  suit_mark: string;
  knowledge_score: number;
  reasoning_depth: number;
  tool_fidelity: number;
  daily_growth_pct: number;
  new_skills_acquired: string[];
  audit_verdict: string;
}

@Component({
  selector: 'app-live-console-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './live-console-page.component.html',
  styleUrl: './live-console-page.component.css'
})
export class LiveConsolePageComponent implements OnInit, OnDestroy {
  readonly speechVoice = inject(SpeechVoiceService);

  // Active view tab
  readonly activeTab = signal<'swarm' | 'code' | 'chat' | 'evolution'>('swarm');

  // Live Swarm Thought Stream
  readonly swarmDialogue = signal<SwarmDialogueItem[]>([]);
  readonly swarmStatus = signal<string>('ONLINE');
  readonly activeBrainsCount = signal<number>(17);

  // Live Code Stream
  readonly codeUpdates = signal<CodeUpdateItem[]>([]);

  // Multi-Channel Squad Chat
  readonly squadChannels = [
    '#squad-command',
    '#squad-frontend',
    '#squad-backend',
    '#squad-testing-qa',
    '#squad-evolution'
  ];
  readonly activeChannel = signal<string>('#squad-command');
  readonly channelMessages = signal<SquadMessage[]>([]);
  chatInputText = '';
  readonly isPostingChat = signal<boolean>(false);

  // Daily Evolution & Knowledge Upgrades
  readonly overallHealthScore = signal<number>(98.4);
  readonly knowledgeNodesIndexed = signal<number>(1420);
  readonly evaluations = signal<AgentEvaluation[]>([]);
  readonly isEvolving = signal<boolean>(false);

  // Voice Listening Stream
  readonly voiceEnabled = signal<boolean>(true);
  private lastSpokenId = '';

  // Notifications Toast
  readonly activeNotification = signal<string | null>('Antigravity Autonomous Core Connected (Port 8000)');

  private pollTimer: any = null;

  ngOnInit(): void {
    this.refreshAllData();
    this.pollTimer = setInterval(() => {
      this.refreshAllData();
    }, 3500);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  async refreshAllData(): Promise<void> {
    await Promise.allSettled([
      this.fetchSwarmDialogue(),
      this.fetchCodeStream(),
      this.fetchChannelMessages(),
      this.fetchDailyEvolution(),
    ]);
  }

  async fetchSwarmDialogue(): Promise<void> {
    try {
      const res = await fetch(getApiUrl('/api/v1/agent-gateway/swarm/live-dialogue?limit=30'));
      if (res.ok) {
        const data = await res.json();
        this.swarmStatus.set(data.status || 'ONLINE');
        this.activeBrainsCount.set(data.brains_count || 17);
        if (Array.isArray(data.dialogue)) {
          this.swarmDialogue.set(data.dialogue);
          this.checkVoiceStream(data.dialogue);
        }
      }
    } catch {
      this.swarmStatus.set('OFFLINE (Retrying...)');
    }
  }

  async fetchCodeStream(): Promise<void> {
    try {
      const res = await fetch(getApiUrl('/api/v1/agent-gateway/live-code-stream?limit=25'));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.updates)) {
          this.codeUpdates.set(data.updates);
        }
      }
    } catch {
      // Offline fallback
    }
  }

  async fetchChannelMessages(): Promise<void> {
    try {
      const cleanCh = this.activeChannel().replace('#', '');
      const res = await fetch(getApiUrl(`/api/v1/agent-gateway/live-chat/channels/${cleanCh}?limit=35`));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          this.channelMessages.set(data.messages);
        }
      }
    } catch {
      // Offline fallback
    }
  }

  async fetchDailyEvolution(): Promise<void> {
    try {
      const res = await fetch(getApiUrl('/api/v1/agent-gateway/evolve/daily-cycle'));
      if (res.ok) {
        const data = await res.json();
        this.overallHealthScore.set(data.overall_health_score || 98.4);
        this.knowledgeNodesIndexed.set(data.knowledge_records_indexed || 1420);
        if (Array.isArray(data.evaluations)) {
          this.evaluations.set(data.evaluations);
        }
      }
    } catch {
      // Retain cached values
    }
  }

  selectTab(tab: 'swarm' | 'code' | 'chat' | 'evolution'): void {
    this.activeTab.set(tab);
  }

  selectChannel(channel: string): void {
    this.activeChannel.set(channel);
    this.fetchChannelMessages();
  }

  async sendChatMessage(): Promise<void> {
    const text = this.chatInputText.trim();
    if (!text || this.isPostingChat()) return;
    this.isPostingChat.set(true);

    try {
      await fetch(getApiUrl('/api/v1/agent-gateway/live-chat/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: this.activeChannel().replace('#', ''),
          sender_id: 'operator',
          message: text,
        }),
      });
      this.chatInputText = '';
      this.showToast(`Directive dispatched to ${this.activeChannel()}`);
      setTimeout(() => this.fetchChannelMessages(), 600);
    } catch (e) {
      console.warn('Post error:', e);
    } finally {
      this.isPostingChat.set(false);
    }
  }

  async triggerEvolutionCycle(): Promise<void> {
    this.isEvolving.set(true);
    this.showToast('Initiating Autonomous Daily Knowledge Assimilation & Benchmark...');
    try {
      const res = await fetch(getApiUrl('/api/v1/agent-gateway/evolve/daily-cycle'), {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        this.overallHealthScore.set(data.overall_health_score || 99.1);
        this.knowledgeNodesIndexed.set(data.knowledge_records_indexed || 1450);
        if (Array.isArray(data.evaluations)) {
          this.evaluations.set(data.evaluations);
        }
        this.showToast(`Daily Knowledge Cycle Complete! Score: ${this.overallHealthScore()}%`);
        if (this.voiceEnabled()) {
          this.speechVoice.speak(`Daily knowledge assimilation complete. Health score: ${this.overallHealthScore()} percent.`);
        }
      }
    } catch {
      this.showToast('Evolution cycle running in local WAL engine.');
    } finally {
      this.isEvolving.set(false);
    }
  }

  toggleVoice(): void {
    this.voiceEnabled.set(!this.voiceEnabled());
    const msg = this.voiceEnabled() ? 'Antigravity Voice Stream Activated' : 'Voice Stream Muted';
    this.showToast(msg);
    if (this.voiceEnabled()) {
      this.speechVoice.speak(msg);
    }
  }

  private checkVoiceStream(dialogue: SwarmDialogueItem[]): void {
    if (!this.voiceEnabled() || dialogue.length === 0) return;
    const latest = dialogue[dialogue.length - 1];
    if (latest && latest.id !== this.lastSpokenId) {
      this.lastSpokenId = latest.id;
      const clean = (latest.message || '').replace(/https?:\/\/\S+/g, '').slice(0, 150);
      this.speechVoice.speak(`${latest.sender_name} reports: ${clean}`);
    }
  }

  showToast(message: string): void {
    this.activeNotification.set(message);
    setTimeout(() => {
      if (this.activeNotification() === message) {
        this.activeNotification.set(null);
      }
    }, 4500);
  }
}
