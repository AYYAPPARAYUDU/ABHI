import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  ResourceSummaryDTO,
  OperatingMode,
  ResourcePressureLevel,
  ModelInstanceRecordDTO,
  ResourceLedgerEntryDTO,
  ResourceLeaseDTO,
} from '../models/resource.model';

@Injectable({
  providedIn: 'root',
})
export class ResourceService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/resources';

  // Core Signals
  summary = signal<ResourceSummaryDTO | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Computed signals
  pressureLevel = computed<ResourcePressureLevel>(
    () => this.summary()?.pressure_level || 'NORMAL'
  );

  operatingMode = computed<OperatingMode>(
    () => this.summary()?.operating_mode || 'BALANCED'
  );

  models = computed<ModelInstanceRecordDTO[]>(
    () => this.summary()?.models || []
  );

  activeLeases = computed<ResourceLeaseDTO[]>(
    () => this.summary()?.active_leases || []
  );

  vramEntry = computed<ResourceLedgerEntryDTO | null>(
    () => this.summary()?.ledger?.['VRAM'] || null
  );

  ramEntry = computed<ResourceLedgerEntryDTO | null>(
    () => this.summary()?.ledger?.['RAM'] || null
  );

  vramUsagePercent = computed<number>(() => {
    const v = this.vramEntry();
    if (!v || v.total <= 0) return 0;
    return Math.min(100, Math.round(((v.allocated + v.reserved) / v.total) * 100));
  });

  ramUsagePercent = computed<number>(() => {
    const r = this.ramEntry();
    if (!r || r.total <= 0) return 0;
    return Math.min(100, Math.round(((r.allocated + r.reserved) / r.total) * 100));
  });

  hardware = computed(() => this.summary()?.hardware || null);

  ledger = computed(() => this.summary()?.ledger || null);

  isDegraded = computed<boolean>(() => {
    const deg = this.summary()?.degraded_mode;
    return deg !== undefined && deg !== 'FULL_CAPABILITY';
  });

  cpuUsagePercent = computed<number>(() => {
    const hw = this.hardware();
    if (!hw) return 0;
    return Math.round(hw.cpu_utilization_percent || 0);
  });

  storageUsagePercent = computed<number>(() => {
    const hw = this.hardware();
    if (!hw || !hw.storage_primary_total_mb || hw.storage_primary_total_mb <= 0) return 0;
    const used = hw.storage_primary_total_mb - (hw.storage_primary_free_mb || 0);
    return Math.round((used / hw.storage_primary_total_mb) * 100);
  });

  pressureBadgeClass = computed<string>(() => {
    const p = this.pressureLevel();
    switch (p) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'ELEVATED':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
  });

  fetchSummary(): Observable<ResourceSummaryDTO> {
    this.isLoading.set(true);
    return this.http.get<ResourceSummaryDTO>(this.baseUrl).pipe(
      tap({
        next: (data) => {
          this.summary.set(data);
          this.isLoading.set(false);
          this.errorMessage.set(null);
        },
        error: (err) => {
          this.errorMessage.set(err.message || 'Failed to load resource summary');
          this.isLoading.set(false);
        },
      })
    );
  }

  setOperatingMode(mode: OperatingMode): Observable<any> {
    return this.http.post(`${this.baseUrl}/mode`, { mode }).pipe(
      tap(() => {
        this.fetchSummary().subscribe();
      })
    );
  }

  loadModel(modelId: string, priority: number = 80): Observable<any> {
    return this.http.post(`${this.baseUrl}/models/${modelId}/load?priority=${priority}`, {}).pipe(
      tap(() => {
        this.fetchSummary().subscribe();
      })
    );
  }

  unloadModel(modelId: string, force: boolean = false): Observable<any> {
    return this.http.post(`${this.baseUrl}/models/${modelId}/unload?force=${force}`, {}).pipe(
      tap(() => {
        this.fetchSummary().subscribe();
      })
    );
  }

  reconcileOrphans(): Observable<any> {
    return this.http.post(`${this.baseUrl}/reconcile`, {}).pipe(
      tap(() => {
        this.fetchSummary().subscribe();
      })
    );
  }
}
