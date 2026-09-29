import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { ResourceService } from './resource.service';
import { ResourceSummaryDTO } from '../models/resource.model';

describe('ResourceService', () => {
  let service: ResourceService;
  let httpMock: any;

  const mockSummary: ResourceSummaryDTO = {
    operating_mode: 'BALANCED',
    degraded_mode: 'FULL_CAPABILITY',
    pressure_level: 'NORMAL',
    hardware: {
      captured_at: Date.now(),
      os_name: 'Windows',
      os_version: '11',
      os_build: '10.0.26200',
      cpu_model: 'AMD Ryzen 7 260',
      cpu_physical_cores: 8,
      cpu_logical_cores: 16,
      cpu_utilization_percent: 15.0,
      ram_total_mb: 24425.0,
      ram_available_mb: 16000.0,
      ram_used_mb: 8425.0,
      ram_utilization_percent: 34.5,
      gpu_detected: true,
      gpu_model: 'NVIDIA GeForce RTX 5050 Laptop GPU',
      gpu_vram_total_mb: 8151.0,
      gpu_vram_used_mb: 1200.0,
      gpu_vram_free_mb: 6951.0,
      gpu_utilization_percent: 5.0,
      gpu_driver_version: '592.82',
      gpu_cuda_version: '13.1',
      gpu_temperature_c: 48.0,
      npu_present: false,
      npu_status: 'UNSUPPORTED',
      storage_primary_total_mb: 522720.0,
      storage_primary_free_mb: 326450.0,
    },
    ledger: {
      RAM: {
        resource_type: 'RAM',
        unit: 'MB',
        total: 24425.0,
        reserved: 4000.0,
        allocated: 1024.0,
        free: 19401.0,
        requested: 1024.0,
        denied_count: 0,
        released_count: 0,
      },
      VRAM: {
        resource_type: 'VRAM',
        unit: 'MB',
        total: 8151.0,
        reserved: 1650.0,
        allocated: 5200.0,
        free: 1301.0,
        requested: 5200.0,
        denied_count: 0,
        released_count: 0,
      },
    },
    active_leases_count: 1,
    loaded_models_count: 1,
    active_workers_count: 0,
    models: [
      {
        instance_id: 'inst_1',
        model_id: 'qwen3:8b',
        model_tag: 'abhi:latest',
        model_digest: 'sha256:500a1',
        format: 'GGUF',
        quantization: 'Q4_K_M',
        parameter_count: '8B',
        context_length: 8192,
        runtime: 'Ollama-Local',
        state: 'LOADED',
        health: 'HEALTHY',
        device: 'GPU',
        use_count: 5,
        estimated_memory_mb: 5200.0,
        actual_memory_mb: 5200.0,
        prompt_tokens_processed: 1000,
        generated_tokens_produced: 250,
        estimated_kv_cache_mb: 75.0,
        is_production: true,
        is_candidate: false,
        is_warm: true,
        failure_count: 0,
      },
    ],
    workers: [],
    active_leases: [
      {
        lease_id: 'lease_123',
        owner_type: 'model',
        owner_id: 'qwen3:8b',
        resource_type: 'VRAM',
        requested_amount: 5200.0,
        granted_amount: 5200.0,
        created_at: Date.now(),
        expires_at: Date.now() + 60000,
        priority: 80,
        state: 'GRANTED',
        metadata: {},
      },
    ],
  };

  beforeEach(() => {
    httpMock = {
      get: vi.fn().mockReturnValue(of(mockSummary)),
      post: vi.fn().mockReturnValue(of({ status: 'SUCCESS' })),
    };

    TestBed.configureTestingModule({
      providers: [
        ResourceService,
        { provide: HttpClient, useValue: httpMock },
      ],
    });
    service = TestBed.inject(ResourceService);
  });

  it('should initialize with default signals', () => {
    expect(service.summary()).toBeNull();
    expect(service.pressureLevel()).toBe('NORMAL');
    expect(service.operatingMode()).toBe('BALANCED');
    expect(service.models().length).toBe(0);
    expect(service.activeLeases().length).toBe(0);
  });

  it('should fetch resource summary and update signals', () => {
    service.fetchSummary().subscribe((data) => {
      expect(data.operating_mode).toBe('BALANCED');
      expect(data.loaded_models_count).toBe(1);
    });

    expect(httpMock.get).toHaveBeenCalledWith('/api/v1/resources');
    expect(service.summary()).toEqual(mockSummary);
    expect(service.models().length).toBe(1);
    expect(service.vramUsagePercent()).toBeGreaterThan(0);
  });

  it('should request operating mode change and re-fetch summary', () => {
    service.setOperatingMode('PERFORMANCE').subscribe();

    expect(httpMock.post).toHaveBeenCalledWith('/api/v1/resources/mode', { mode: 'PERFORMANCE' });
    expect(httpMock.get).toHaveBeenCalled();
  });

  it('should call loadModel and unloadModel endpoints', () => {
    service.loadModel('bge-m3').subscribe();
    expect(httpMock.post).toHaveBeenCalledWith('/api/v1/resources/models/bge-m3/load?priority=80', {});

    service.unloadModel('bge-m3', false).subscribe();
    expect(httpMock.post).toHaveBeenCalledWith('/api/v1/resources/models/bge-m3/unload?force=false', {});
  });

  it('should call reconcileOrphans endpoint', () => {
    service.reconcileOrphans().subscribe();
    expect(httpMock.post).toHaveBeenCalledWith('/api/v1/resources/reconcile', {});
  });

  it('should calculate computed usage percentages correctly', () => {
    service.fetchSummary().subscribe();
    expect(service.cpuUsagePercent()).toBe(15);
    expect(service.ramUsagePercent()).toBe(21);
    expect(service.storageUsagePercent()).toBe(38);
  });

  it('should evaluate degraded status based on degraded_mode', () => {
    expect(service.isDegraded()).toBe(false);
    service.fetchSummary().subscribe();
    expect(service.isDegraded()).toBe(false);
  });

  it('should compute hardware and ledger signal projections', () => {
    service.fetchSummary().subscribe();
    const hw = service.hardware();
    expect(hw).not.toBeNull();
    expect(hw?.gpu_model).toContain('RTX 5050');
    const ledger = service.ledger();
    expect(ledger?.['RAM']).toBeDefined();
    expect(ledger?.['VRAM']).toBeDefined();
  });

  it('should handle zero totals gracefully in computed percentages', () => {
    expect(service.cpuUsagePercent()).toBe(0);
    expect(service.ramUsagePercent()).toBe(0);
    expect(service.vramUsagePercent()).toBe(0);
    expect(service.storageUsagePercent()).toBe(0);
  });
});
