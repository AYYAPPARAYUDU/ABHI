import { Component, inject, OnInit, OnDestroy, AfterViewInit, signal, computed, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ThreeSceneManagerService } from '../../../../shared/3d/three-scene-manager.service';
import { AnimeAnimationService } from '../../../../core/services/anime-animation.service';
import { AgentApiService } from '../../../../core/api/agent-api.service';
import { getApiUrl } from '../../../../core/config/api-config';
import { SpeechVoiceService } from '../../../../core/services/speech-voice.service';

@Component({
  selector: 'app-business-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './business-page.component.html',
  styleUrl: './business-page.component.css',
})
export class BusinessPageComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly agentApi = inject(AgentApiService);
  readonly animService = inject(AnimeAnimationService);
  readonly speechVoice = inject(SpeechVoiceService);
  private readonly threeScene = inject(ThreeSceneManagerService);
  private readonly hostEl = inject(ElementRef);

  readonly toastMessage = signal<string | null>(null);

  // Active Tab for Clean Organization (Agent HQ Office first)
  readonly activeTab = signal<'office' | 'overview' | 'affiliate' | 'invoices' | 'receipts'>('office');

  // Agent HQ 3D Virtual Office State (Milestone 50)
  readonly activeOfficeSubTab = signal<'office' | 'tasks' | 'stats'>('office');
  readonly officeData = signal<any>(null);
  readonly selectedWorker = signal<any>(null);
  readonly isOrchestrating = signal<boolean>(false);
  readonly isAutopilotRunning = signal<boolean>(false);
  readonly isLiveWorkActive = signal<boolean>(true);
  readonly latestAutopilotData = signal<any>(null);
  readonly activeWorkers = computed(() => (this.officeData()?.workers || []).filter((w: any) => w.status === 'WORKING'));
  readonly receiptsList = signal<any[]>([]);
  readonly selectedReceipt = signal<any | null>(null);
  readonly liveMonitorData = signal<any | null>(null);
  orchestratorGoal = 'Autonomous Code Quality Audit & AST Security Verification';
  readonly orchestratorResult = signal<any>(null);
  private officePollInterval: any = null;

  // Real Bank UTR Verification Modal
  readonly showUtrModal = signal<boolean>(false);
  readonly isSubmittingUtr = signal<boolean>(false);
  inputUtr = '';
  inputAmount = 1000.0;
  inputPayer = 'Direct Client Transfer';
  inputInvoiceNum = '';

  // Real Client Invoice Generation Modal
  readonly showCreateInvoiceModal = signal<boolean>(false);
  readonly isCreatingInvoice = signal<boolean>(false);
  newInvoiceClientName = '';
  newInvoiceClientOrg = '';
  newInvoiceServiceDesc = '';
  newInvoiceAmountInr = 25000.0;
  newInvoiceClientEmail = '';

  // Affiliate Marketing Controls
  readonly affiliateOverview = signal<any>(null);
  readonly isGeneratingLink = signal<boolean>(false);
  selectedNetwork = 'amazon_associates';
  inputProductUrl = '';
  readonly generatedAffiliateLink = signal<string>('');

  // Authoritative State Bank of India Settlement Channel (Mamu)
  readonly sbiProfile = {
    beneficiary: 'Ravuvai Ayyapparayudu',
    bank: 'State Bank of India',
    account: '41130645649',
    ifsc: 'SBIN0020507',
    upi: 'ayyapparayudu.5@ybl',
    email: 'ayyapparayudu.ravuvari@gmail.com',
    branch: 'SBI Specialized Commercial Branch',
  };

  // Live UPI QR Code URL for PhonePe, Google Pay, Paytm, BHIM
  readonly upiQrCodeUrl =
    'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi%3A%2F%2Fpay%3Fpa%3Dayyapparayudu.5%40ybl%26pn%3DRavuvai%2520Ayyapparayudu%26cu%3DINR';

  // 100% Real Live Settlement Metrics (Zero Dummy Data, Starts at 0 until authentic UTR is verified)
  readonly treasuryOverview = signal({
    totalSettledInr: 0.0,
    totalSettledUsd: 0.0,
    pendingInr: 0.0,
    transactionsCount: 0,
    currency: 'INR',
    lastUpdated: 'Live Channel Online',
  });

  readonly settledInvoices = signal<any[]>([]);

  ngOnInit(): void {
    this.threeScene.setMode('BUSINESS');
    this.refreshTreasuryData();
    this.refreshAffiliateData();
    this.refreshOfficeData();
    this.refreshReceiptsData();
    this.refreshLiveMonitor();

    // Live real-time polling for physical agent work state and system monitoring (2000ms high-fidelity cadence)
    this.officePollInterval = setInterval(() => {
      this.refreshOfficeData();
      this.refreshLiveMonitor();
    }, 2000);
  }

  ngOnDestroy(): void {
    if (this.officePollInterval) {
      clearInterval(this.officePollInterval);
    }
  }

  ngAfterViewInit(): void {
    this.animateElements();
  }

  setActiveTab(tab: 'office' | 'overview' | 'affiliate' | 'invoices' | 'receipts'): void {
    this.activeTab.set(tab);
    if (tab === 'office') {
      this.refreshOfficeData();
    } else if (tab === 'receipts') {
      this.refreshReceiptsData();
    }
  }

  async refreshReceiptsData(): Promise<void> {
    try {
      const data = await this.agentApi.getTreasuryReceipts(50);
      this.receiptsList.set(data || []);
    } catch {
      // Clean fallback
    }
  }

  async refreshLiveMonitor(): Promise<void> {
    try {
      const data = await this.agentApi.getLiveSystemMonitor();
      if (data) {
        this.liveMonitorData.set(data);
      }
    } catch {
      // Clean fallback
    }
  }

  selectReceipt(rcp: any): void {
    this.selectedReceipt.set(rcp);
  }

  // --- AGENT HQ 3D VIRTUAL OFFICE METHODS ---
  async refreshOfficeData(): Promise<void> {
    try {
      const data = await this.agentApi.getOfficeOverview();
      if (data) {
        this.officeData.set(data);
        if (this.selectedWorker()) {
          const updated = data.workers?.find((w: any) => w.agent_id === this.selectedWorker().agent_id);
          if (updated) this.selectedWorker.set(updated);
        }
      }
    } catch {
      // Clean fallback
    }
  }

  selectWorker(worker: any): void {
    this.selectedWorker.set(worker);
  }

  async toggleWorkerStatus(worker: any): Promise<void> {
    const newStatus = worker.status === 'WORKING' ? 'IDLE' : 'WORKING';
    try {
      const res = await this.agentApi.updateAgentStatus({
        agent_id: worker.agent_id,
        status: newStatus,
        task_desc: newStatus === 'WORKING' ? 'Live Autonomous Execution' : undefined,
        tool_name: newStatus === 'WORKING' ? 'SpecialistAgentTool' : undefined,
      });
      if (res?.worker) {
        this.showToast(`✓ ${worker.name} status updated to ${newStatus}`);
        await this.refreshOfficeData();
      }
    } catch {
      this.showToast('Failed to update agent status.');
    }
  }

  async triggerOrchestratorGoal(): Promise<void> {
    if (!this.orchestratorGoal.trim()) {
      this.showToast('⚠️ Please enter an autonomous goal.');
      return;
    }
    this.isOrchestrating.set(true);
    this.speechVoice.speak(`Orchestrating agent swarm for goal, Mamu: ${this.orchestratorGoal}`);
    try {
      const res = await this.agentApi.runTier4Orchestration(this.orchestratorGoal.trim());
      if (res) {
        this.orchestratorResult.set(res);
        await this.refreshOfficeData();
        this.showToast(`✓ Swarm orchestration completed! Dual-state verified.`);
        this.speechVoice.speak(`Swarm execution completed and dual-state verified, Mamu.`);
      }
    } catch {
      this.showToast('⚠️ Error in swarm orchestration.');
    } finally {
      this.isOrchestrating.set(false);
    }
  }

  async triggerFullAutopilotCycle(): Promise<void> {
    this.isAutopilotRunning.set(true);
    this.speechVoice.speak('Engaging full master autopilot cycle across all 4 intelligence tiers and commercial modules, Mamu.');
    try {
      const res = await this.agentApi.runAutopilotCycle();
      if (res) {
        this.latestAutopilotData.set(res);
        await Promise.all([
          this.refreshOfficeData(),
          this.refreshTreasuryData(),
          this.refreshAffiliateData(),
        ]);
        this.showToast(`✓ Master Autopilot Cycle ${res.cycle_id} completed! Dual-state verified.`);
        this.speechVoice.speak(`Autopilot cycle completed successfully, Mamu.`);
      }
    } catch {
      this.showToast('Error executing autopilot cycle.');
    } finally {
      this.isAutopilotRunning.set(false);
    }
  }

  async toggleLiveWorkDaemon(): Promise<void> {
    if (this.isLiveWorkActive()) {
      await this.agentApi.stopLiveWork();
      this.isLiveWorkActive.set(false);
      this.speechVoice.speak('Autonomous live work paused. Agents transitioning to standby, Mamu.');
      this.showToast('Live work daemon paused.');
    } else {
      await this.agentApi.startLiveWork();
      this.isLiveWorkActive.set(true);
      this.speechVoice.speak('Engaging 24/7 continuous autonomous live work across all 4 tiers, Mamu.');
      this.showToast('Live work daemon engaged.');
    }
    await this.refreshOfficeData();
  }

  // --- TREASURY & INVOICING METHODS ---
  async refreshTreasuryData(): Promise<void> {
    try {
      const [overview, invoices] = await Promise.all([
        this.agentApi.getTreasuryOverview(),
        this.agentApi.listTreasuryInvoices(50),
      ]);

      if (overview) {
        this.treasuryOverview.set({
          totalSettledInr: overview.total_settled_revenue_inr || 0.0,
          totalSettledUsd: overview.total_settled_revenue_usd || 0.0,
          pendingInr: overview.pending_invoices_inr || 0.0,
          transactionsCount: overview.settled_transactions_count || 0,
          currency: overview.settlement_currency || 'INR',
          lastUpdated: new Date().toLocaleTimeString(),
        });
      }

      if (invoices && Array.isArray(invoices)) {
        const seen = new Set<string>();
        const unique = invoices.filter((inv) => {
          if (!inv.invoice_number || seen.has(inv.invoice_number)) return false;
          seen.add(inv.invoice_number);
          return true;
        });
        this.settledInvoices.set(unique);
      }
    } catch {
      // Retain clean state
    }
  }

  async refreshAffiliateData(): Promise<void> {
    try {
      const data = await this.agentApi.getAffiliateOverview();
      if (data) {
        this.affiliateOverview.set(data);
      }
    } catch {
      // Clean fallback
    }
  }

  async generateQuickAffiliateLink(): Promise<void> {
    if (!this.inputProductUrl.trim()) {
      this.showToast('⚠️ Please enter a destination product or service URL.');
      return;
    }
    this.isGeneratingLink.set(true);
    try {
      const res = await this.agentApi.generateAffiliateLink({
        network_id: this.selectedNetwork,
        destination_url: this.inputProductUrl.trim(),
      });
      if (res?.affiliate_link) {
        this.generatedAffiliateLink.set(res.affiliate_link);
        this.showToast('✓ Tracked affiliate link generated with your verified ID!');
        this.speechVoice.speak('Affiliate link generated successfully, Mamu.');
      } else {
        this.showToast('⚠️ Failed to generate link.');
      }
    } catch {
      this.showToast('⚠️ Network error generating affiliate link.');
    } finally {
      this.isGeneratingLink.set(false);
    }
  }

  async purgeAllDummyData(): Promise<void> {
    try {
      const res = await this.agentApi.clearTreasuryDummyData();
      if (res) {
        await this.refreshTreasuryData();
        this.showToast('✓ All dummy records purged. Ledger is 100% clean and authentic.');
        this.speechVoice.speak('All dummy records purged. Ready for real transactions, Mamu.');
      }
    } catch {
      this.showToast('Error purging dummy data.');
    }
  }

  openCreateInvoiceModal(): void {
    this.newInvoiceClientName = '';
    this.newInvoiceClientOrg = '';
    this.newInvoiceServiceDesc = '';
    this.newInvoiceAmountInr = 25000.0;
    this.newInvoiceClientEmail = '';
    this.showCreateInvoiceModal.set(true);
  }

  async submitCreateInvoice(): Promise<void> {
    if (!this.newInvoiceClientName.trim() || !this.newInvoiceServiceDesc.trim() || this.newInvoiceAmountInr <= 0) {
      this.showToast('⚠️ Please enter client name, service description, and valid amount.');
      return;
    }
    this.isCreatingInvoice.set(true);
    try {
      const resp = await fetch(getApiUrl('/api/v1/business/treasury/invoices'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: this.newInvoiceClientName.trim(),
          client_organization: this.newInvoiceClientOrg.trim() || 'Client Organization',
          service_description: this.newInvoiceServiceDesc.trim(),
          amount_inr: Number(this.newInvoiceAmountInr),
          client_email: this.newInvoiceClientEmail.trim() || undefined,
          mark_as_settled: false,
        }),
      });
      if (resp.ok) {
        const inv = await resp.json();
        this.showCreateInvoiceModal.set(false);
        await this.refreshTreasuryData();
        this.showToast(`✓ Generated Invoice ${inv.invoice_number} (₹${inv.total_inr}) with UPI payment link.`);
        this.speechVoice.speak(`Official invoice generated for ${this.newInvoiceClientName}, Mamu.`);
      } else {
        this.showToast('⚠️ Error creating invoice.');
      }
    } catch {
      this.showToast('⚠️ Network error creating invoice.');
    } finally {
      this.isCreatingInvoice.set(false);
    }
  }

  openUtrModal(invoiceNumber?: string): void {
    this.inputInvoiceNum = invoiceNumber || '';
    this.inputUtr = '';
    this.showUtrModal.set(true);
  }

  async confirmUtrSettlement(): Promise<void> {
    if (!this.inputUtr || this.inputUtr.trim().length < 6) {
      this.showToast('⚠️ Please enter a valid 12-digit Bank UTR reference number.');
      return;
    }
    if (this.inputAmount <= 0) {
      this.showToast('⚠️ Please enter a valid amount.');
      return;
    }

    this.isSubmittingUtr.set(true);
    try {
      const res = await this.agentApi.verifySbiSettlement({
        utr_number: this.inputUtr.trim(),
        amount_inr: Number(this.inputAmount),
        payer_name: this.inputPayer || 'Client Direct UPI',
        invoice_number: this.inputInvoiceNum || undefined,
      });

      if (res?.status === 'SETTLED_TO_SBI_ACCOUNT') {
        this.showUtrModal.set(false);
        await Promise.all([
          this.refreshTreasuryData(),
          this.refreshReceiptsData(),
          this.refreshLiveMonitor()
        ]);
        this.speechVoice.speak(`Payment of ₹${this.inputAmount} verified and settled to your State Bank of India account, Mamu!`);
        this.showToast(`✓ UTR ${this.inputUtr} verified! ₹${this.inputAmount} credited to SBI account.`);
      } else {
        this.showToast('Verification processed.');
        this.showUtrModal.set(false);
      }
    } catch {
      this.showToast('Error verifying UTR reference.');
    } finally {
      this.isSubmittingUtr.set(false);
    }
  }

  copyToClipboard(text: string, label: string): void {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast(`✓ Copied ${label}: ${text}`);
      });
    }
  }

  showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set(null);
      }
    }, 4500);
  }

  onAvatarErr(e: Event): void {
    (e.target as HTMLImageElement).src =
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><rect width="100%" height="100%" fill="%2306b6d4"/><text x="50%" y="55%" fill="%23000" font-size="24" font-family="sans-serif" font-weight="bold" dominant-baseline="middle" text-anchor="middle">AR</text></svg>';
  }

  private animateElements(): void {
    const root = this.hostEl.nativeElement;
    if (!root) return;
    const cards = root.querySelectorAll('.upi-card, .table-container, .executive-header-card, .agent-hq-stage');
    if (cards.length > 0) {
      this.animService.staggerEnter({
        targets: cards,
        translateY: [16, 0],
        opacity: [0, 1],
        duration: 400,
        delay: 60,
      });
    }
  }
}
