import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import {
  BusinessApproval,
  BusinessOpportunity,
  BusinessProject,
  BusinessSector,
  FinancialSummary,
} from '../models/business.model';
import { getApiUrl } from '../../../core/config/api-config';

@Injectable({
  providedIn: 'root',
})
export class BusinessService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = getApiUrl('/api/v1/business');

  readonly sectors = signal<BusinessSector[]>([]);
  readonly projects = signal<BusinessProject[]>([]);
  readonly selectedProject = signal<BusinessProject | null>(null);
  readonly selectedSector = signal<BusinessSector | null>(null);
  readonly opportunities = signal<BusinessOpportunity[]>([]);
  readonly financials = signal<FinancialSummary | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  fetchSectors(): Observable<BusinessSector[]> {
    this.isLoading.set(true);
    return this.http.get<BusinessSector[]>(`${this.baseUrl}/sectors`).pipe(
      tap((data) => {
        this.sectors.set(data);
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.errorMessage.set(err.message || 'Failed to load business sectors');
        this.isLoading.set(false);
        return of([]);
      })
    );
  }

  fetchProjects(sectorId?: string): Observable<BusinessProject[]> {
    this.isLoading.set(true);
    const url = sectorId ? `${this.baseUrl}/projects?sector_id=${sectorId}` : `${this.baseUrl}/projects`;
    return this.http.get<BusinessProject[]>(url).pipe(
      tap((data) => {
        this.projects.set(data);
        if (data.length > 0 && !this.selectedProject()) {
          this.selectedProject.set(data[0]);
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.errorMessage.set(err.message || 'Failed to load projects');
        this.isLoading.set(false);
        return of([]);
      })
    );
  }

  fetchProject(projectId: string): Observable<BusinessProject | null> {
    return this.http.get<BusinessProject>(`${this.baseUrl}/projects/${projectId}`).pipe(
      tap((data) => this.selectedProject.set(data)),
      catchError((err) => {
        this.errorMessage.set(err.message || 'Failed to load project details');
        return of(null);
      })
    );
  }

  createProject(payload: {
    sector_id: string;
    name: string;
    objective: string;
    autonomy_level: number;
    budget_limit_usd: number;
  }): Observable<BusinessProject | null> {
    return this.http.post<BusinessProject>(`${this.baseUrl}/projects`, payload).pipe(
      tap((newProj) => {
        this.projects.update((prev) => [...prev, newProj]);
        this.selectedProject.set(newProj);
        this.fetchSectors().subscribe({ error: () => {} });
      }),
      catchError((err) => {
        this.errorMessage.set(err.message || 'Failed to create business project');
        return of(null);
      })
    );
  }

  executeNextStep(projectId: string, overrideStop = false): Observable<any> {
    return this.http.post(`${this.baseUrl}/projects/${projectId}/execute-step`, {
      override_stop_conditions: overrideStop,
    }).pipe(
      tap(() => {
        this.fetchProject(projectId).subscribe({ error: () => {} });
        this.fetchFinancials().subscribe({ error: () => {} });
      })
    );
  }

  resolveApproval(projectId: string, approvalId: string, approve: boolean): Observable<any> {
    return this.http.post(`${this.baseUrl}/projects/${projectId}/approvals/${approvalId}/resolve`, {
      approve,
    }).pipe(
      tap(() => {
        this.fetchProject(projectId).subscribe({ error: () => {} });
      })
    );
  }

  fetchOpportunities(): Observable<BusinessOpportunity[]> {
    return this.http.get<BusinessOpportunity[]>(`${this.baseUrl}/opportunities`).pipe(
      tap((data) => this.opportunities.set(data)),
      catchError((err) => {
        return of([]);
      })
    );
  }

  evaluateOpportunity(payload: {
    sector_id: string;
    title: string;
    concept_description: string;
    target_audience?: string;
    target_pricing_usd?: number;
  }): Observable<BusinessOpportunity | null> {
    return this.http.post<BusinessOpportunity>(`${this.baseUrl}/opportunities/evaluate`, payload).pipe(
      tap((opp) => {
        this.opportunities.update((prev) => [opp, ...prev]);
      }),
      catchError((err) => {
        this.errorMessage.set(err.message || 'Failed to score opportunity');
        return of(null);
      })
    );
  }

  fetchFinancials(): Observable<FinancialSummary | null> {
    return this.http.get<FinancialSummary>(`${this.baseUrl}/financials/summary`).pipe(
      tap((data) => this.financials.set(data)),
      catchError((err) => of(null))
    );
  }

  fetchTreasuryOverview(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/treasury/overview`).pipe(
      catchError(() => of({
        settled_revenue_inr: 0,
        settled_revenue_usd: 0,
        total_invoiced_inr: 0,
        pending_invoices_count: 0,
        settled_transactions_count: 0,
        bank_name: "State Bank of India",
        account_number_masked: "SBI ****5649",
        account_holder: "Ravuvai Ayyapparayudu",
        ifsc_code: "SBIN0020507",
        upi_id: "ayyapparayudu.5@ybl"
      }))
    );
  }

  fetchTreasuryInvoices(limit = 50): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/treasury/invoices?limit=${limit}`).pipe(
      catchError(() => of([]))
    );
  }

  fetchTreasuryReceipts(limit = 50): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/treasury/receipts?limit=${limit}`).pipe(
      catchError(() => of([]))
    );
  }

  verifySbiSettlement(payload: {
    utr_number: string;
    amount_inr: number;
    payer_name: string;
    invoice_number?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/treasury/verify-settlement`, payload);
  }

  createTreasuryInvoice(payload: {
    client_name: string;
    service_description: string;
    amount_inr: number;
    client_email?: string;
    client_organization?: string;
    mark_as_settled?: boolean;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/treasury/invoices`, payload);
  }

  fetchLiveMonitor(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/live-monitor`).pipe(
      catchError(() => of(null))
    );
  }

  // =========================================================================
  // CREDENTIALS & API VAULT (TABLE STRUCTURE)
  // =========================================================================

  fetchVaultCredentials(category?: string, showSecrets = false): Observable<any[]> {
    let url = `${this.baseUrl}/vault/credentials?show_secrets=${showSecrets}`;
    if (category) {
      url += `&category=${category}`;
    }
    return this.http.get<any[]>(url).pipe(
      catchError(() => of([]))
    );
  }

  saveVaultCredential(payload: {
    service_name: string;
    category: string;
    identity_username: string;
    secret_value: string;
    documentation_url?: string;
    description?: string;
    id?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/vault/credentials`, payload);
  }

  deleteVaultCredential(credId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/vault/credentials/${credId}`);
  }

  // =========================================================================
  // N8N WORKFLOW AUTOMATION ENGINE
  // =========================================================================

  fetchN8nWorkflows(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/n8n/workflows`).pipe(
      catchError(() => of([]))
    );
  }

  fetchN8nHistory(limit = 20): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/n8n/history?limit=${limit}`).pipe(
      catchError(() => of([]))
    );
  }

  executeN8nWorkflow(workflowId: string, payload?: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/n8n/execute`, {
      workflow_id: workflowId,
      payload: payload || {}
    });
  }

  runMasterRevenueCycle(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/ceo/revenue-cycle`, {});
  }

  // =========================================================================
  // MOBILE ADB & PHONEPE MINI STATEMENT INTEGRATION
  // =========================================================================

  fetchMobileStatus(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/mobile/status`).pipe(
      catchError(() => of({ connected: false, message: 'Mobile bridge offline' }))
    );
  }

  fetchMobileTransactions(serial?: string, limit = 50): Observable<any> {
    let url = `${this.baseUrl}/mobile/bank-transactions?limit=${limit}`;
    if (serial) url += `&serial=${serial}`;
    return this.http.get<any>(url).pipe(
      catchError(() => of({ connected: false, transactions: [], otps: [] }))
    );
  }

  fetchMobileOtps(serial?: string, limit = 20): Observable<any> {
    let url = `${this.baseUrl}/mobile/otps?limit=${limit}`;
    if (serial) url += `&serial=${serial}`;
    return this.http.get<any>(url).pipe(
      catchError(() => of({ connected: false, otps: [] }))
    );
  }

  launchPhonePe(serial?: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/mobile/launch-phonepe`, { serial });
  }

  connectWirelessMobile(ip = '10.65.249.121', port = 5555): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/mobile/connect-wireless`, { ip, port });
  }

  parseSmsText(text: string, sender = 'SMS_PASTE', recordToTreasury = false): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/mobile/parse-sms-text`, {
      text,
      sender,
      record_to_treasury: recordToTreasury
    });
  }

  // =========================================================================
  // AFFILIATE & REVENUE ENGINE
  // =========================================================================

  fetchAffiliateOverview(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/affiliate/overview`).pipe(
      catchError(() => of({
        total_clicks: 0,
        total_commissions_inr: 0,
        active_campaigns_count: 3,
        partner_tag: 'ayyappa-21',
        campaigns: []
      }))
    );
  }

  generateAffiliateLink(productUrl: string, category = 'TECH', campaign = 'DIRECT'): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/affiliate/generate-link`, {
      product_url: productUrl,
      category,
      campaign
    });
  }

  runAuditBounty(repoUrl?: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/ceo/audit-bounty`, { repo_url: repoUrl });
  }

  // =========================================================================
  // QUANT TRADING & DETERMINISTIC RISK GATEKEEPER
  // =========================================================================

  fetchQuantTelemetry(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/quant/telemetry`).pipe(
      catchError(() => of({
        strategy: { generation: 1, sharpe_ratio: 0, win_rate_pct: 0, max_drawdown_pct: 0 },
        risk_gatekeeper: { current_equity: 500.0, current_drawdown_pct: 0, circuit_breaker_active: false, max_drawdown_limit_pct: 2.0 },
        recent_journal: [],
        total_journal_trades: 0,
        watchlist: ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'BTC-USD']
      }))
    );
  }

  optimizeQuantStrategy(symbol = 'RELIANCE.NS'): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/quant/optimize`, { symbol });
  }

  evaluateQuantOpportunity(symbol = 'RELIANCE.NS'): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/quant/evaluate`, { symbol });
  }

  resetQuantCircuitBreaker(operator = 'Mamu'): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/quant/reset-circuit-breaker`, { operator });
  }

  startLiveMicroTrade(symbol = 'RELIANCE.NS'): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/quant/live-trade/start`, { symbol });
  }

  fetchLiveTradeStatus(symbol = 'RELIANCE.NS'): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/quant/live-trade/status?symbol=${encodeURIComponent(symbol)}`);
  }

  closeLiveTrade(symbol = 'RELIANCE.NS'): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/quant/live-trade/close`, { symbol });
  }
}
