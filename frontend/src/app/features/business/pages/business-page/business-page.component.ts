import { Component, inject, OnInit, AfterViewInit, signal, ElementRef } from '@angular/core';
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
export class BusinessPageComponent implements OnInit, AfterViewInit {
  readonly agentApi = inject(AgentApiService);
  readonly animService = inject(AnimeAnimationService);
  readonly speechVoice = inject(SpeechVoiceService);
  private readonly threeScene = inject(ThreeSceneManagerService);
  private readonly hostEl = inject(ElementRef);

  readonly toastMessage = signal<string | null>(null);

  // Active Tab for Clean Organization
  readonly activeTab = signal<'overview' | 'affiliate' | 'invoices'>('overview');

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
  }

  ngAfterViewInit(): void {
    this.animateElements();
  }

  setActiveTab(tab: 'overview' | 'affiliate' | 'invoices'): void {
    this.activeTab.set(tab);
  }

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

  // Open Real Bank UTR Verification Modal
  openUtrModal(invoiceNumber?: string): void {
    this.inputInvoiceNum = invoiceNumber || '';
    this.inputUtr = '';
    this.showUtrModal.set(true);
  }

  // Confirm Real Inward UPI Payment (credited to SBI Account)
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
        await this.refreshTreasuryData();
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
    const cards = root.querySelectorAll('.upi-card, .table-container, .executive-header-card');
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
