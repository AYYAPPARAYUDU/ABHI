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

@Injectable({
  providedIn: 'root',
})
export class BusinessService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://127.0.0.1:8000/api/v1/business';

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
        this.fetchSectors().subscribe();
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
        this.fetchProject(projectId).subscribe();
        this.fetchFinancials().subscribe();
      })
    );
  }

  resolveApproval(projectId: string, approvalId: string, approve: boolean): Observable<any> {
    return this.http.post(`${this.baseUrl}/projects/${projectId}/approvals/${approvalId}/resolve`, {
      approve,
    }).pipe(
      tap(() => {
        this.fetchProject(projectId).subscribe();
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
}
