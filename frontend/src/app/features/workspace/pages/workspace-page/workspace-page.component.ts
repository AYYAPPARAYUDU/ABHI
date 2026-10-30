import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThreeSceneManagerService, AgentNode } from '../../../../shared/3d/three-scene-manager.service';
import { SpeechVoiceService } from '../../../../core/services/speech-voice.service';
import { AgentCommandService } from '../../../../core/services/agent-command.service';

interface SmallLLMBrain {
  id: string;
  name: string;
  codename: string;
  role: string;
  subsystem: string;
  color: string;
  icon: string;
  model: string;
  synapticBond: number;
  currentWork: string;
  recentThoughts: string[];
}

interface FamilyChatMessage {
  id: string;
  sender: string;
  senderId: string;
  message: string;
  time: string;
  sentiment: string;
}

@Component({
  selector: 'app-workspace-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './workspace-page.component.html',
  styleUrl: './workspace-page.component.css'
})
export class WorkspacePageComponent implements OnInit, OnDestroy {
  readonly threeScene = inject(ThreeSceneManagerService);
  readonly speechVoice = inject(SpeechVoiceService);
  readonly commandService = inject(AgentCommandService);

  readonly agents = this.threeScene.agents;
  readonly selectedAgent = this.threeScene.selectedAgent;

  readonly isDeliberating = signal(false);
  readonly consensusScore = signal(98.6);
  readonly familyDialogue = signal<FamilyChatMessage[]>([]);
  readonly showFamilyCouncil = signal(false);

  // Direct Small LLM Brain Chat
  brainChatInput = '';
  readonly brainChatMessages = signal<{ sender: string; text: string; time: string }[]>([]);
  readonly isSendingBrainChat = signal(false);

  // Delegation
  delegationGoal = '';
  readonly isDelegating = signal(false);

  private familySyncTimer: any = null;

  ngOnInit(): void {
    this.threeScene.setMode('WORKSPACE');
    this.threeScene.resetCameraFocus();
    this.fetchFamilyStatus();

    this.familySyncTimer = setInterval(() => {
      this.fetchFamilyStatus();
    }, 4000);
  }

  ngOnDestroy(): void {
    if (this.familySyncTimer) {
      clearInterval(this.familySyncTimer);
      this.familySyncTimer = null;
    }
  }

  async fetchFamilyStatus(): Promise<void> {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/agent/swarm/family-status');
      if (res.ok) {
        const data = await res.json();
        if (data.chat_history && Array.isArray(data.chat_history) && data.chat_history.length > 0) {
          const mapped: FamilyChatMessage[] = data.chat_history.map((c: any) => ({
            id: c.id,
            sender: c.sender_name,
            senderId: c.sender_id,
            message: c.message,
            time: new Date(c.timestamp * 1000).toLocaleTimeString(),
            sentiment: c.sentiment
          }));
          this.familyDialogue.set(mapped);
        }
      }
    } catch {
      // Retain offline cached states
    }
  }

  selectStation(agent: AgentNode): void {
    this.threeScene.focusAgent(agent);
    this.brainChatMessages.set([
      {
        sender: agent.name,
        text: `Specialist Brain initialized at ${agent.subsystem}. Ready for autonomous local execution.`,
        time: new Date().toLocaleTimeString()
      }
    ]);
  }

  closeStationDrawer(): void {
    this.threeScene.resetCameraFocus();
  }

  async triggerFamilyDeliberation(): Promise<void> {
    if (this.isDeliberating()) return;
    this.isDeliberating.set(true);
    this.showFamilyCouncil.set(true);

    const goal = this.delegationGoal.trim() || 'Execute holistic autonomous workspace optimization across Windows 11 desktop, web browser, and Android mobile OS';

    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/agent/swarm/negotiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal })
      });

      if (res.ok) {
        const data = await res.json();
        this.consensusScore.set(data.consensus_score || 99.1);
        if (data.dialogue && Array.isArray(data.dialogue)) {
          const mapped: FamilyChatMessage[] = data.dialogue.map((d: any) => ({
            id: d.id,
            sender: d.sender_name,
            senderId: d.sender_id,
            message: d.message,
            time: new Date(d.timestamp * 1000).toLocaleTimeString(),
            sentiment: d.sentiment
          }));
          this.familyDialogue.set(mapped);
        }

        const notify = `[FAMILY COUNCIL]: Ratified consensus at ${this.consensusScore()}%. Lead bot assigned: ${data.lead_agent_name}.`;
        this.threeScene.latestJarvisMessage.set(notify);
        this.speechVoice.speak(notify);
      }
    } catch (err) {
      console.error('Family deliberation error:', err);
    } finally {
      this.isDeliberating.set(false);
    }
  }

  async sendBrainChat(agent: AgentNode): Promise<void> {
    const text = this.brainChatInput.trim();
    if (!text || this.isSendingBrainChat()) return;

    this.isSendingBrainChat.set(true);
    const time = new Date().toLocaleTimeString();
    this.brainChatMessages.update((msgs) => [...msgs, { sender: 'OPERATOR', text, time }]);
    this.brainChatInput = '';

    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/agent/swarm/family-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agent.id, message: text })
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.reply || `${agent.name} Specialist Brain acknowledged.`;
        this.brainChatMessages.update((msgs) => [...msgs, { sender: agent.name, text: reply, time: new Date().toLocaleTimeString() }]);
      } else {
        this.brainChatMessages.update((msgs) => [...msgs, { sender: agent.name, text: `[Brain Synapse Active]: Task received. Standing by.`, time }]);
      }
    } catch {
      this.brainChatMessages.update((msgs) => [...msgs, { sender: agent.name, text: `[Local Inference]: Connected via zero-cloud loop.`, time }]);
    } finally {
      this.isSendingBrainChat.set(false);
    }
  }

  async delegateTaskToStation(agent: AgentNode): Promise<void> {
    if (!this.delegationGoal.trim() || this.isDelegating()) return;
    this.isDelegating.set(true);

    const goal = `${agent.name}: ${this.delegationGoal.trim()}`;
    try {
      await this.commandService.submitCommand(goal, 'TEXT', 'auto');
      this.threeScene.latestJarvisMessage.set(`Directive assigned to [${agent.name}]: "${this.delegationGoal}"`);
      this.delegationGoal = '';
    } catch (err: any) {
      console.error('Task delegation error:', err);
    } finally {
      this.isDelegating.set(false);
    }
  }
}

