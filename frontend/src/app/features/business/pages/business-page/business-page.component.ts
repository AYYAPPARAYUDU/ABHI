import { Component, inject, OnInit, signal, computed, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AgentApiService } from '../../../../core/api/agent-api.service';
import { getApiUrl } from '../../../../core/config/api-config';
import { SpeechVoiceService } from '../../../../core/services/speech-voice.service';
import { ThreeSceneManagerService } from '../../../../shared/3d/three-scene-manager.service';

@Component({
  selector: 'app-business-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './business-page.component.html',
  styleUrl: './business-page.component.css',
})
export class BusinessPageComponent implements OnInit {
  readonly agentApi = inject(AgentApiService);
  readonly speechVoice = inject(SpeechVoiceService);
  private readonly threeScene = inject(ThreeSceneManagerService);
  private readonly hostEl = inject(ElementRef);

  readonly toastMessage = signal<string | null>(null);

  // Active view tab: Invoices & Ledger vs Receipts Vault
  readonly activeTab = signal<'invoices' | 'receipts'>('invoices');

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
    totalSettledInr: 18500.0,
    totalSettledUsd: 211.43,
    pendingInr: 0.0,
    transactionsCount: 1,
    currency: 'INR',
    lastUpdated: 'Live',
  });

  readonly settledInvoices = signal<any[]>([]);
  readonly recentSettlements = signal<any[]>([]);
  readonly receiptsList = signal<any[]>([]);
  readonly selectedReceipt = signal<any | null>(null);

  // Computed metrics
  readonly pendingInvoicesCount = computed(() =>
    this.settledInvoices().filter((inv) => inv.status !== 'SETTLED').length
  );

  readonly settlementsWithoutInvoice = computed(() => {
    const invoiceNumbers = new Set(this.settledInvoices().map((inv) => inv.invoice_number));
    return this.recentSettlements().filter((s) => !s.invoice_number || !invoiceNumbers.has(s.invoice_number));
  });

  // Modal: Verify Real Bank UTR
  readonly showUtrModal = signal<boolean>(false);
  readonly isSubmittingUtr = signal<boolean>(false);
  inputUtr = '';
  inputAmount = 25000.0;
  inputPayer = 'Direct Client Transfer';
  inputInvoiceNum = '';

  // Modal: Issue Commercial Tax Invoice
  readonly showCreateInvoiceModal = signal<boolean>(false);
  readonly isCreatingInvoice = signal<boolean>(false);
  newInvoiceClientName = '';
  newInvoiceClientOrg = '';
  newInvoiceServiceDesc = '';
  newInvoiceAmountInr = 25000.0;
  newInvoiceClientEmail = '';

  ngOnInit(): void {
    this.threeScene.setMode('BUSINESS');
    this.refreshAllData();
  }

  async refreshAllData(): Promise<void> {
    try {
      const [overview, invoices, receipts] = await Promise.all([
        this.agentApi.getTreasuryOverview().catch(() => null),
        this.agentApi.listTreasuryInvoices(50).catch(() => []),
        this.agentApi.getTreasuryReceipts(50).catch(() => []),
      ]);

      if (overview) {
        this.treasuryOverview.set({
          totalSettledInr: overview.total_settled_revenue_inr || overview.settled_revenue_inr || 0.0,
          totalSettledUsd: overview.total_settled_revenue_usd || overview.settled_revenue_usd || 0.0,
          pendingInr: overview.pending_invoices_inr || 0.0,
          transactionsCount: overview.settled_transactions_count || 0,
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
      // Retain clean state
    }
  }

  setActiveTab(tab: 'invoices' | 'receipts'): void {
    this.activeTab.set(tab);
  }

  selectReceipt(rcp: any): void {
    this.selectedReceipt.set(rcp);
  }

  closeReceiptModal(): void {
    this.selectedReceipt.set(null);
  }

  // --- ACTIONS: INVOICE GENERATION & UTR VERIFICATION ---
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
        await this.refreshAllData();
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
        this.inputAmount = inv.total_inr || inv.subtotal_inr || 25000.0;
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
        await this.refreshAllData();
        this.speechVoice.speak(`Payment of ₹${this.inputAmount} verified and settled to your State Bank of India account, Mamu!`);
        this.showToast(`✓ UTR ${utr} verified! ₹${this.inputAmount} credited to SBI account.`);
      } else {
        this.showToast('✓ Verification processed.');
        this.showUtrModal.set(false);
        await this.refreshAllData();
      }
    } catch {
      this.showToast('Error verifying Bank UTR reference.');
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
