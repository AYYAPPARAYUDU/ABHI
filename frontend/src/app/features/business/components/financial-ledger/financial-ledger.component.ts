import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinancialSummary } from '../../models/business.model';
import { AnimeCounterDirective } from '../../../../shared/directives/anime-counter.directive';

@Component({
  selector: 'app-financial-ledger',
  standalone: true,
  imports: [CommonModule, AnimeCounterDirective],
  templateUrl: './financial-ledger.component.html',
  styleUrl: './financial-ledger.component.css',
})
export class FinancialLedgerComponent {
  readonly financials = input<FinancialSummary | null>(null);

  get isNetPositive(): boolean {
    return (this.financials()?.net_result_usd || 0) >= 0;
  }
}
