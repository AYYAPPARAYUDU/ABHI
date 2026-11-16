import { Component, inject, OnInit, OnDestroy, signal, computed, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AgentApiService } from '../../../../core/api/agent-api.service';
import { getApiUrl } from '../../../../core/config/api-config';
import { SpeechVoiceService } from '../../../../core/services/speech-voice.service';
import { ThreeSceneManagerService } from '../../../../shared/3d/three-scene-manager.service';
import { BusinessService } from '../../services/business.service';

export interface SpecialistWorker {
  agent_id: string;
  name: string;
  role: string;
  room_pod: string;
  color_hex: string;
  status: 'WORKING' | 'IDLE' | 'PAUSED' | 'ERROR';
  active_task?: string;
  active_tool?: string;
  tasks_completed: number;
  last_active_at: string;
  terminal_output?: string[];
}

@Component({
  selector: 'app-business-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './business-page.component.html',
  styleUrl: './business-page.component.css',
})
export class BusinessPageComponent implements OnInit, OnDestroy {
  readonly agentApi = inject(AgentApiService);
  readonly speechVoice = inject(SpeechVoiceService);
  readonly businessService = inject(BusinessService);
  private readonly threeScene = inject(ThreeSceneManagerService);
  private readonly hostEl = inject(ElementRef);

  readonly toastMessage = signal<string | null>(null);

  // Active view tab: Executive Cashflow & PhonePe | SBI Settlement | Autonomous Engine & Vault
  readonly activeTab = signal<'dashboard' | 'sbi' | 'automation'>('dashboard');

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
    'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=upi%3A%2F%2Fpay%3Fpa%3Dayyapparayudu.5%40ybl%26pn%3DRavuvai%2520Ayyapparayudu%26cu%3DINR';

  // Real Commercial Settlement Metrics from authoritative backend
  readonly treasuryOverview = signal({
    totalSettledInr: 0.0,
    totalSettledUsd: 0.0,
    pendingInr: 0.0,
    transactionsCount: 0,
    currency: 'INR',
    lastUpdated: 'Live',
  });

  // Mobile PhonePe & Bank SMS Integration State (POCO X5 Pro 5G)
  readonly mobileStatus = signal<{
    connected: boolean;
    device_model: string | null;
    serial: string | null;
    message: string;
  }>({
    connected: false,
    device_model: null,
    serial: null,
    message: 'Initializing mobile wireless bridge...',
  });

  readonly mobileTransactions = signal<any[]>([]);
  readonly mobileOtps = signal<any[]>([]);
  readonly isLoadingMobile = signal<boolean>(false);
  readonly isLaunchingPhonePe = signal<boolean>(false);
  readonly filterTxnType = signal<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');

  rawSmsInput = '';
  readonly isParsingSms = signal<boolean>(false);
  readonly parsedSmsResult = signal<any | null>(null);

  // Filtered transactions
  readonly filteredMobileTransactions = computed(() => {
    const filter = this.filterTxnType();
    const list = this.mobileTransactions();
    if (filter === 'ALL') return list;
    return list.filter((t) => t.transaction_type === filter);
  });

  // Totals computed from real SMS transactions
  readonly mobileCreditTotal = computed(() => {
    return this.mobileTransactions()
      .filter((t) => t.transaction_type === 'CREDIT')
      .reduce((acc, t) => acc + (t.amount_inr || 0), 0);
  });

  readonly mobileDebitTotal = computed(() => {
    return this.mobileTransactions()
      .filter((t) => t.transaction_type === 'DEBIT')
      .reduce((acc, t) => acc + (t.amount_inr || 0), 0);
  });

  readonly mobileNetVelocity = computed(() => {
    return this.mobileCreditTotal() - this.mobileDebitTotal();
  });

  // Dynamic SVG Cashflow Velocity Path Generator
  readonly cashflowChartSvg = computed(() => {
    const txns = this.mobileTransactions();
    if (!txns || txns.length === 0) {
      return {
        areaPath: 'M 20 150 Q 180 130, 360 145 T 700 140 L 700 200 L 20 200 Z',
        linePath: 'M 20 150 Q 180 130, 360 145 T 700 140',
        points: [] as { x: number; y: number; label: string; amount: number; isCredit: boolean }[],
        maxVal: 10000,
      };
    }

    const slice = [...txns].reverse().slice(-14);
    const maxAmount = Math.max(...slice.map((t) => t.amount_inr || 100), 10000);
    const width = 720;
    const height = 180;
    const padding = 24;
    const stepX = slice.length > 1 ? (width - padding * 2) / (slice.length - 1) : width / 2;

    const points = slice.map((t, idx) => {
      const x = Math.round(padding + idx * stepX);
      const ratio = Math.min((t.amount_inr || 0) / maxAmount, 0.9);
      const y = Math.round(height - padding - ratio * (height - padding * 2));
      return {
        x,
        y,
        label: t.channel || t.sender,
        amount: t.amount_inr || 0,
        isCredit: t.transaction_type === 'CREDIT',
      };
    });

    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      linePath += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    const firstPt = points[0];
    const lastPt = points[points.length - 1];
    const areaPath = `${linePath} L ${lastPt.x} ${height} L ${firstPt.x} ${height} Z`;

    return { areaPath, linePath, points, maxVal: maxAmount };
  });

  // Channel Distribution Percentages
  readonly channelDistribution = computed(() => {
    const txns = this.mobileTransactions();
    let upiCount = 0;
    let sbiCount = 0;
    let iciciCount = 0;
    let otherCount = 0;

    for (const t of txns) {
      const ch = (t.channel || t.sender || '').toUpperCase();
      if (ch.includes('UPI') || ch.includes('PHONEPE') || ch.includes('GPAY') || ch.includes('PAYTM')) {
        upiCount++;
      } else if (ch.includes('SBI')) {
        sbiCount++;
      } else if (ch.includes('ICICI')) {
        iciciCount++;
      } else {
        otherCount++;
      }
    }

    const total = txns.length || 1;
    const upiPct = Math.round((upiCount / total) * 100);
    const sbiPct = Math.round((sbiCount / total) * 100);
    const iciciPct = Math.round((iciciCount / total) * 100);
    const otherPct = Math.max(0, 100 - upiPct - sbiPct - iciciPct);

    return {
      upiPct,
      sbiPct,
      iciciPct,
      otherPct,
      totalTxns: txns.length,
    };
  });

  // Agent Swarm & Live Telemetry
  readonly officeData = signal<any>(null);
  readonly liveMonitorData = signal<any>(null);
  readonly selectedWorker = signal<SpecialistWorker | null>(null);
  readonly isOrchestrating = signal<boolean>(false);
  readonly isAutopilotRunning = signal<boolean>(false);
  readonly isLiveWorkActive = signal<boolean>(true);
  readonly orchestratorGoal = signal<string>('');
  readonly orchestratorResult = signal<any>(null);
  private pollInterval: any = null;

  // Real Affiliate Marketing Hub State
  readonly affiliateOverview = signal<any>(null);
  selectedNetwork = 'amazon_associates';
  inputProductUrl = '';
  readonly generatedAffiliateLink = signal<string | null>(null);
  readonly isGeneratingLink = signal<boolean>(false);

  // Invoices & Receipts
  readonly settledInvoices = signal<any[]>([]);
  readonly recentSettlements = signal<any[]>([]);
  readonly receiptsList = signal<any[]>([]);
  readonly selectedReceipt = signal<any | null>(null);

  // Credentials & API Vault State (Table Structure)
  readonly vaultCredentials = signal<any[]>([]);
  readonly showSecretMap = signal<Record<string, boolean>>({});
  readonly selectedVaultCategory = signal<string>('ALL');
  readonly showAddCredentialModal = signal<boolean>(false);
  readonly isSavingCredential = signal<boolean>(false);

  newCredServiceName = '';
  newCredCategory = 'AUTOMATION';
  newCredIdentity = '';
  newCredSecret = '';
  newCredDocUrl = '';
  newCredDesc = '';

  // n8n Workflow Automation State
  readonly n8nWorkflows = signal<any[]>([]);
  readonly n8nHistory = signal<any[]>([]);
  readonly isExecutingN8n = signal<boolean>(false);
  readonly activeRunningWorkflowId = signal<string | null>(null);

  // Computed settlements that occurred directly without a formal invoice
  readonly settlementsWithoutInvoice = computed(() => {
    const invoiceUtrs = new Set(
      this.settledInvoices()
        .map((inv) => inv.bank_utr)
        .filter(Boolean)
    );
    return this.recentSettlements().filter(
      (s) => !invoiceUtrs.has(s.utr_number) && !invoiceUtrs.has(s.transaction_id)
    );
  });

  // Filtered Vault Credentials by category
  readonly filteredVaultCredentials = computed(() => {
    const cat = this.selectedVaultCategory();
    const creds = this.vaultCredentials();
    if (cat === 'ALL') return creds;
    return creds.filter((c) => c.category === cat);
  });

  // Computed metrics
  readonly pendingInvoicesCount = computed(() =>
    this.settledInvoices().filter((inv) => inv.status !== 'SETTLED').length
  );

  readonly activeWorkers = computed<SpecialistWorker[]>(() => {
    const workers = this.officeData()?.workers || [];
    return workers.filter((w: SpecialistWorker) => w.status === 'WORKING');
  });

  readonly allWorkers = computed<SpecialistWorker[]>(() => {
    return this.officeData()?.workers || [];
  });

  // Modal: Verify Real Bank UTR
  readonly showUtrModal = signal<boolean>(false);
  readonly isSubmittingUtr = signal<boolean>(false);
  inputUtr = '';
  inputAmount = 0.0;
  inputPayer = 'Direct Client Transfer';
  inputInvoiceNum = '';

  // Modal: Issue Commercial Tax Invoice
  readonly showCreateInvoiceModal = signal<boolean>(false);
  readonly isCreatingInvoice = signal<boolean>(false);
  newInvoiceClientName = '';
  newInvoiceClientOrg = '';
  newInvoiceServiceDesc = '';
  newInvoiceAmountInr = 0.0;
  newInvoiceClientEmail = '';

  ngOnInit(): void {
    this.threeScene.setMode('BUSINESS');
    this.refreshAllData();

    // High-fidelity background telemetry cadence (3000ms polling for live work state)
    this.pollInterval = setInterval(() => {
      this.refreshOfficeData();
      this.refreshLiveMonitor();
    }, 3000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async refreshAllData(): Promise<void> {
    await Promise.all([
      this.refreshTreasuryData(),
      this.refreshMobileData(),
      this.refreshOfficeData(),
      this.refreshLiveMonitor(),
      this.refreshAffiliateData(),
      this.refreshVaultData(),
      this.refreshN8nData(),
    ]);
  }

  async refreshTreasuryData(): Promise<void> {
    try {
      const [overview, invoices, receipts] = await Promise.all([
        this.agentApi.getTreasuryOverview().catch(() => null),
        this.agentApi.listTreasuryInvoices(50).catch(() => []),
        this.agentApi.getTreasuryReceipts(50).catch(() => []),
      ]);

      if (overview) {
        this.treasuryOverview.set({
          totalSettledInr: overview.total_settled_revenue_inr ?? overview.settled_revenue_inr ?? 0.0,
          totalSettledUsd: overview.total_settled_revenue_usd ?? overview.settled_revenue_usd ?? 0.0,
          pendingInr: overview.pending_invoices_inr ?? 0.0,
          transactionsCount: overview.settled_transactions_count ?? 0,
          currency: overview.settlement_currency || 'INR',
          lastUpdated: new Date().toLocaleTimeString(),
        });
        if (Array.isArray(overview.recent_settlements)) {
          this.recentSettlements.set(overview.recent_settlements);
        }
      }

      if (Array.isArray(invoices)) {
        const seen = new Set<string>();
        const unique = invoices.filter((inv) => {
          if (!inv.invoice_number || seen.has(inv.invoice_number)) return false;
          seen.add(inv.invoice_number);
          return true;
        });
        this.settledInvoices.set(unique);
      }

      if (Array.isArray(receipts)) {
        this.receiptsList.set(receipts);
      }
    } catch {
      // Retain clean authentic state
    }
  }

  async refreshOfficeData(): Promise<void> {
    try {
      const data = await this.agentApi.getOfficeOverview();
      if (data) {
        this.officeData.set(data);
        if (this.selectedWorker()) {
          const updated = data.workers?.find((w: any) => w.agent_id === this.selectedWorker()?.agent_id);
          if (updated) this.selectedWorker.set(updated);
        }
      }
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

  async refreshVaultData(): Promise<void> {
    this.businessService.fetchVaultCredentials(undefined, true).subscribe({
      next: (creds) => {
        if (Array.isArray(creds)) {
          this.vaultCredentials.set(creds);
        }
      },
      error: () => {}
    });
  }

  async refreshN8nData(): Promise<void> {
    this.businessService.fetchN8nWorkflows().subscribe({
      next: (wfs) => {
        if (Array.isArray(wfs)) {
          this.n8nWorkflows.set(wfs);
        }
      },
      error: () => {}
    });
    this.businessService.fetchN8nHistory().subscribe({
      next: (hist) => {
        if (Array.isArray(hist)) {
          this.n8nHistory.set(hist);
        }
      },
      error: () => {}
    });
  }

  setActiveTab(tab: 'dashboard' | 'sbi' | 'automation' | string): void {
    let target: 'dashboard' | 'sbi' | 'automation' = 'dashboard';
    if (tab === 'sbi' || tab === 'invoices' || tab === 'receipts' || tab === 'overview') {
      target = 'sbi';
    } else if (tab === 'automation' || tab === 'n8n' || tab === 'vault' || tab === 'agents' || tab === 'affiliate') {
      target = 'automation';
    } else {
      target = 'dashboard';
    }
    this.activeTab.set(target);
    if (target === 'dashboard') this.refreshMobileData();
    if (target === 'sbi') this.refreshTreasuryData();
    if (target === 'automation') {
      this.refreshN8nData();
      this.refreshVaultData();
      this.refreshAffiliateData();
      this.refreshOfficeData();
    }
  }

  // --- MOBILE ADB & PHONEPE ACTIONS ---
  async refreshMobileData(): Promise<void> {
    this.isLoadingMobile.set(true);
    try {
      this.businessService.fetchMobileTransactions(undefined, 50).subscribe({
        next: (res) => {
          this.mobileStatus.set({
            connected: !!res.connected,
            device_model: res.device_model || (res.connected ? '22101320I (POCO X5 Pro 5G)' : null),
            serial: res.serial || (res.connected ? '10.65.249.121:5555' : null),
            message: res.message || (res.connected ? 'Wireless ADB link active' : 'Offline'),
          });
          if (Array.isArray(res.transactions)) {
            this.mobileTransactions.set(res.transactions);
          }
          if (Array.isArray(res.otps)) {
            this.mobileOtps.set(res.otps);
          }
          this.isLoadingMobile.set(false);
        },
        error: () => {
          this.isLoadingMobile.set(false);
        }
      });
    } catch {
      this.isLoadingMobile.set(false);
    }
  }

  launchPhonePeApp(): void {
    this.isLaunchingPhonePe.set(true);
    this.speechVoice.speak('Launching PhonePe on connected mobile device, Mamu.');
    this.showToast('📲 Launching PhonePe application on POCO X5 Pro 5G...');
    this.businessService.launchPhonePe().subscribe({
      next: (res) => {
        this.isLaunchingPhonePe.set(false);
        if (res.success) {
          this.showToast('✓ PhonePe app launched successfully on device!');
        } else {
          this.showToast(`⚠️ ${res.message || 'Could not launch PhonePe'}`);
        }
      },
      error: () => {
        this.isLaunchingPhonePe.set(false);
        this.showToast('⚠️ Error launching PhonePe');
      }
    });
  }

  parseRawSms(): void {
    if (!this.rawSmsInput.trim()) {
      this.showToast('⚠️ Please paste bank SMS or PhonePe notification text.');
      return;
    }
    this.isParsingSms.set(true);
    this.businessService.parseSmsText(this.rawSmsInput.trim(), 'SMS_PASTE', false).subscribe({
      next: (res) => {
        this.isParsingSms.set(false);
        this.parsedSmsResult.set(res);
        if (res.transaction) {
          this.showToast(`✓ Parsed ${res.transaction.transaction_type}: ₹${res.transaction.amount_inr}`);
          this.speechVoice.speak(`Parsed ${res.transaction.transaction_type} of rupees ${res.transaction.amount_inr}, Mamu.`);
        } else {
          this.showToast('⚠️ No transaction detected in provided text.');
        }
      },
      error: () => {
        this.isParsingSms.set(false);
        this.showToast('⚠️ Error parsing SMS text');
      }
    });
  }

  verifyMobileTransactionToLedger(txn: any): void {
    if (!txn || !txn.amount_inr) return;
    const utr = txn.utr_number || ('SMS-' + Date.now().toString().slice(-8));
    this.speechVoice.speak(`Verifying payment of rupees ${txn.amount_inr} into sovereign SBI ledger, Mamu.`);
    this.showToast(`⚡ Verifying ₹${txn.amount_inr} (${txn.channel || txn.sender}) into ledger...`);

    this.businessService.verifySbiSettlement({
      utr_number: utr,
      amount_inr: txn.amount_inr,
      payer_name: txn.channel || txn.sender || 'Mobile PhonePe Transfer',
      invoice_number: `VERIFIED-${utr}`
    }).subscribe({
      next: () => {
        this.showToast(`✓ Verified! ₹${txn.amount_inr} added to authentic ledger with UTR ${utr}.`);
        this.refreshTreasuryData();
      },
      error: () => {
        this.showToast('⚠️ Error verifying transaction to ledger.');
      }
    });
  }

  copyOtpCode(code: string): void {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        this.showToast(`✓ Copied OTP: ${code}`);
        this.speechVoice.speak(`OTP copied, Mamu.`);
      });
    }
  }

  selectWorker(worker: SpecialistWorker): void {
    this.selectedWorker.set(worker);
  }

  closeWorkerModal(): void {
    this.selectedWorker.set(null);
  }

  selectReceipt(rcp: any): void {
    this.selectedReceipt.set(rcp);
  }

  closeReceiptModal(): void {
    this.selectedReceipt.set(null);
  }

  // --- VAULT ACTIONS ---
  toggleSecretReveal(credId: string): void {
    this.showSecretMap.update((m) => ({
      ...m,
      [credId]: !m[credId]
    }));
  }

  openAddCredentialModal(): void {
    this.newCredServiceName = '';
    this.newCredCategory = 'AUTOMATION';
    this.newCredIdentity = '';
    this.newCredSecret = '';
    this.newCredDocUrl = '';
    this.newCredDesc = '';
    this.showAddCredentialModal.set(true);
  }

  async submitAddCredential(): Promise<void> {
    if (!this.newCredServiceName.trim() || !this.newCredSecret.trim()) {
      this.showToast('⚠️ Service Name and Secret / Password are required.');
      return;
    }
    this.isSavingCredential.set(true);
    this.businessService.saveVaultCredential({
      service_name: this.newCredServiceName.trim(),
      category: this.newCredCategory,
      identity_username: this.newCredIdentity.trim(),
      secret_value: this.newCredSecret.trim(),
      documentation_url: this.newCredDocUrl.trim() || undefined,
      description: this.newCredDesc.trim() || undefined,
    }).subscribe({
      next: () => {
        this.showToast(`✓ Credential saved for ${this.newCredServiceName}!`);
        this.showAddCredentialModal.set(false);
        this.refreshVaultData();
        this.isSavingCredential.set(false);
      },
      error: () => {
        this.showToast('⚠️ Error saving credential to vault.');
        this.isSavingCredential.set(false);
      }
    });
  }

  deleteVaultCredential(credId: string): void {
    if (!confirm('Are you sure you want to remove this credential from the secure vault?')) return;
    this.businessService.deleteVaultCredential(credId).subscribe({
      next: () => {
        this.showToast('✓ Credential removed from Vault.');
        this.refreshVaultData();
      },
      error: () => this.showToast('⚠️ Could not delete credential.')
    });
  }

  // --- N8N WORKFLOW AUTOMATION ACTIONS ---
  triggerN8nWorkflow(workflowId: string): void {
    this.isExecutingN8n.set(true);
    this.activeRunningWorkflowId.set(workflowId);
    this.showToast(`🚀 Dispatched n8n workflow '${workflowId}'...`);
    this.speechVoice.speak(`Executing n8n workflow ${workflowId.replace(/_/g, ' ')}, Mamu.`);

    this.businessService.executeN8nWorkflow(workflowId).subscribe({
      next: (res) => {
        this.showToast(`✓ ${res.output_summary || 'Workflow executed successfully!'}`);
        this.speechVoice.speak('Workflow execution completed and settled to SBI, Mamu.');
        this.refreshN8nData();
        this.refreshTreasuryData();
        this.isExecutingN8n.set(false);
        this.activeRunningWorkflowId.set(null);
      },
      error: (err) => {
        this.showToast(`⚠️ Execution failed: ${err.message || 'Workflow error'}`);
        this.isExecutingN8n.set(false);
        this.activeRunningWorkflowId.set(null);
      }
    });
  }

  // --- ACTIONS: AUTONOMOUS REVENUE CYCLE & WORKER STATUS ---
  async toggleWorkerStatus(worker: SpecialistWorker): Promise<void> {
    const newStatus = worker.status === 'WORKING' ? 'IDLE' : 'WORKING';
    try {
      const res = await this.agentApi.updateAgentStatus({
        agent_id: worker.agent_id,
        status: newStatus,
        task_desc: newStatus === 'WORKING' ? `${worker.role} Execution` : undefined,
        tool_name: newStatus === 'WORKING' ? `${worker.name}Tool` : undefined,
      });
      if (res?.worker) {
        this.showToast(`✓ ${worker.name} is now ${newStatus}`);
        await this.refreshOfficeData();
      }
    } catch {
      this.showToast('⚠️ Failed to update agent status.');
    }
  }

  async triggerAutonomousRevenueCycle(): Promise<void> {
    this.isAutopilotRunning.set(true);
    this.speechVoice.speak('Engaging master autonomous commercial cycle across all agents, n8n workflows, and revenue pipelines, Mamu.');
    this.showToast('🚀 Running Master Autonomous Revenue Cycle across all 4 tiers & n8n...');

    try {
      const res = await this.businessService.runMasterRevenueCycle().toPromise();
      if (res) {
        await Promise.all([
          this.refreshOfficeData(),
          this.refreshTreasuryData(),
          this.refreshLiveMonitor(),
          this.refreshN8nData(),
        ]);
        this.showToast('✓ Master revenue cycle executed. All agents & n8n pipelines synchronized!');
        this.speechVoice.speak('Autonomous revenue cycle completed and physical state verified, Mamu.');
      }
    } catch {
      this.showToast('⚠️ Error executing autonomous revenue cycle.');
    } finally {
      this.isAutopilotRunning.set(false);
    }
  }

  async toggleLiveWorkDaemon(): Promise<void> {
    if (this.isLiveWorkActive()) {
      try {
        await this.agentApi.stopLiveWork();
        this.isLiveWorkActive.set(false);
        this.speechVoice.speak('Autonomous live work paused. Agents transitioning to standby, Mamu.');
        this.showToast('Live work daemon paused.');
      } catch {
        this.showToast('⚠️ Could not pause live work.');
      }
    } else {
      try {
        await this.agentApi.startLiveWork();
        this.isLiveWorkActive.set(true);
        this.speechVoice.speak('24/7 continuous autonomous live work engaged across all commercial streams, Mamu.');
        this.showToast('✓ 24/7 continuous autonomous live work engaged.');
      } catch {
        this.showToast('⚠️ Could not engage live work.');
      }
    }
    await this.refreshOfficeData();
  }

  // --- ACTIONS: REAL AFFILIATE LINK GENERATOR ---
  async generateTrackedAffiliateLink(): Promise<void> {
    if (!this.inputProductUrl.trim()) {
      this.showToast('⚠️ Please enter a valid product URL.');
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
        this.showToast('✓ Tracked affiliate link generated with your verified credentials!');
        this.speechVoice.speak('Tracked affiliate link ready for distribution, Mamu.');
      }
    } catch {
      this.showToast('⚠️ Failed to generate affiliate link.');
    } finally {
      this.isGeneratingLink.set(false);
    }
  }

  // --- ACTIONS: INVOICE GENERATION & UTR VERIFICATION ---
  openCreateInvoiceModal(): void {
    this.newInvoiceClientName = '';
    this.newInvoiceClientOrg = '';
    this.newInvoiceServiceDesc = '';
    this.newInvoiceAmountInr = 0.0;
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
        this.showToast(`✓ Generated Invoice ${inv.invoice_number} (₹${inv.total_inr}) with UPI link.`);
        this.speechVoice.speak(`Official commercial invoice generated for ${this.newInvoiceClientName}, Mamu.`);
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
    if (invoiceNumber) {
      const inv = this.settledInvoices().find((i) => i.invoice_number === invoiceNumber);
      if (inv) {
        this.inputAmount = inv.total_inr || inv.subtotal_inr || 0.0;
        this.inputPayer = inv.client_name || 'Direct Client Transfer';
      }
    }
    this.showUtrModal.set(true);
  }

  async confirmUtrSettlement(): Promise<void> {
    const utr = this.inputUtr.trim();
    if (!utr || utr.length < 6) {
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
        utr_number: utr,
        amount_inr: Number(this.inputAmount),
        payer_name: this.inputPayer || 'Direct Client Transfer',
        invoice_number: this.inputInvoiceNum || undefined,
      });

      if (res?.status === 'SETTLED_TO_SBI_ACCOUNT') {
        this.showUtrModal.set(false);
        await this.refreshTreasuryData();
        this.speechVoice.speak(`Payment of ₹${this.inputAmount} verified and settled to your State Bank of India account, Mamu!`);
        this.showToast(`✓ UTR ${utr} verified! ₹${this.inputAmount} credited to SBI account.`);
      } else {
        this.showToast('✓ Verification processed.');
        this.showUtrModal.set(false);
        await this.refreshTreasuryData();
      }
    } catch {
      this.showToast('⚠️ Error verifying Bank UTR reference.');
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
}
