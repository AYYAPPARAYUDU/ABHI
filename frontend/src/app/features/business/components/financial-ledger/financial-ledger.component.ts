import { Component, input, inject, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinancialSummary } from '../../models/business.model';
import { AnimeCounterDirective } from '../../../../shared/directives/anime-counter.directive';
import { BusinessService } from '../../services/business.service';

export interface LedgerTransaction {
  transaction_id: string;
  utr_number?: string;
  invoice_number?: string;
  amount_inr: number;
  amount_usd: number;
  client_name: string;
  beneficiary_account?: string;
  account_holder?: string;
  ifsc?: string;
  channel?: string;
  settled_at: string;
  status: string;
}

@Component({
  selector: 'app-financial-ledger',
  standalone: true,
  imports: [CommonModule, AnimeCounterDirective],
  templateUrl: './financial-ledger.component.html',
  styleUrl: './financial-ledger.component.css',
})
export class FinancialLedgerComponent implements OnInit {
  private readonly businessService = inject(BusinessService);

  readonly financials = input<FinancialSummary | null>(null);
  readonly transactionsInput = input<any[] | null>(null);
  readonly invoicesInput = input<any[] | null>(null);

  readonly transactions = signal<any[]>([]);
  readonly invoices = signal<any[]>([]);
  readonly activeLedgerTab = signal<'transactions' | 'invoices'>('transactions');
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly copiedUtr = signal<string | null>(null);

  // Sensitive Financial & Personal Data Privacy State
  readonly isSensitiveRevealed = signal<boolean>(false);

  constructor() {
    effect(() => {
      const txs = this.transactionsInput();
      if (txs && txs.length > 0) {
        this.transactions.set(txs);
      }
    });

    effect(() => {
      const invs = this.invoicesInput();
      if (invs && invs.length > 0) {
        this.invoices.set(invs);
      }
    });
  }

  get isNetPositive(): boolean {
    return (this.financials()?.net_result_usd || 0) >= 0;
  }

  readonly settledCount = computed(() => this.transactions().length);

  readonly isSeedOnly = computed(() => {
    const list = this.transactions();
    if (list.length !== 1) return false;
    const item = list[0];
    const txnId = (item.transaction_id || item.utr_number || '').toUpperCase();
    const client = (item.client_name || '').toLowerCase();
    return txnId.includes('SEED') || client.includes('seed');
  });

  readonly disclaimerText = computed(() => {
    if (this.isSensitiveRevealed()) {
      return 'State Bank of India (A/C: 41130645649, IFSC: SBIN0020507, UPI: ayyapparayudu.5@ybl) · Ravuvai Ayyapparayudu';
    }
    return 'State Bank of India (A/C: SBI ****5649, IFSC: SBIN****507, UPI: ayy****@ybl) · Ravuvai A*********';
  });

  toggleSensitiveData(): void {
    this.isSensitiveRevealed.update((v) => !v);
  }

  maskAccountNumber(acc?: string): string {
    if (this.isSensitiveRevealed()) return acc || '41130645649';
    if (!acc) return 'SBI ****5649';
    const clean = acc.replace(/\D/g, '');
    const last4 = clean.length >= 4 ? clean.slice(-4) : '5649';
    return `SBI ****${last4}`;
  }

  maskUpi(upi?: string): string {
    if (this.isSensitiveRevealed()) return upi || 'ayyapparayudu.5@ybl';
    const target = upi || 'ayyapparayudu.5@ybl';
    const parts = target.split('@');
    if (parts.length === 2) {
      const handle = parts[0];
      const domain = parts[1];
      const prefix = handle.length > 3 ? handle.slice(0, 3) : handle.slice(0, 1);
      return `${prefix}****@${domain}`;
    }
    return 'ayy****@ybl';
  }

  maskIfsc(ifsc?: string): string {
    if (this.isSensitiveRevealed()) return ifsc || 'SBIN0020507';
    const code = ifsc || 'SBIN0020507';
    if (code.length >= 7) {
      return `${code.slice(0, 4)}****${code.slice(-3)}`;
    }
    return 'SBIN****507';
  }

  maskAccountHolder(name?: string): string {
    if (this.isSensitiveRevealed()) return name || 'Ravuvai Ayyapparayudu';
    const target = name || 'Ravuvai Ayyapparayudu';
    const parts = target.split(' ');
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[1].charAt(0)}*********`;
    }
    return `${target.slice(0, 3)}*********`;
  }

  maskChannel(channel?: string): string {
    if (!channel) return `UPI (${this.maskUpi()})`;
    if (this.isSensitiveRevealed()) return channel;
    return channel.replace(/ayyapparayudu\.5@ybl/gi, this.maskUpi('ayyapparayudu.5@ybl'));
  }

  ngOnInit(): void {
    if (this.transactionsInput() && this.transactionsInput()!.length > 0) {
      this.transactions.set(this.transactionsInput()!);
    } else {
      this.loadTransactions();
    }

    if (this.invoicesInput() && this.invoicesInput()!.length > 0) {
      this.invoices.set(this.invoicesInput()!);
    } else {
      this.loadInvoices();
    }
  }

  loadTransactions(): void {
    this.isLoading.set(true);
    this.businessService.fetchTreasuryLedger().subscribe({
      next: (txs) => {
        this.transactions.set(Array.isArray(txs) ? txs : []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.message || 'Failed to load ledger transactions');
        this.isLoading.set(false);
      },
    });
  }

  loadInvoices(): void {
    this.businessService.fetchTreasuryInvoices().subscribe({
      next: (invs) => {
        this.invoices.set(Array.isArray(invs) ? invs : []);
      },
      error: () => {},
    });
  }

  copyToClipboard(text: string): void {
    if (navigator?.clipboard && text) {
      navigator.clipboard.writeText(text).then(() => {
        this.copiedUtr.set(text);
        setTimeout(() => {
          if (this.copiedUtr() === text) {
            this.copiedUtr.set(null);
          }
        }, 3000);
      });
    }
  }
}
