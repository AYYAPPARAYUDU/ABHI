export type ResourceType = 'CPU' | 'RAM' | 'GPU' | 'VRAM' | 'NPU' | 'PROCESS' | 'BROWSER' | 'MODEL_CONTEXT' | 'STORAGE';

export type WorkloadPriority = 100 | 90 | 80 | 70 | 50 | 40 | 30 | 10;

export type ResourcePressureLevel = 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

export type ModelRuntimeState =
  | 'DISCOVERED'
  | 'REGISTERED'
  | 'AVAILABLE'
  | 'LOADING'
  | 'LOADED'
  | 'WARM'
  | 'IN_USE'
  | 'IDLE'
  | 'EVICTING'
  | 'EVICTED'
  | 'FAILED'
  | 'QUARANTINED';

export type ModelHealthState = 'HEALTHY' | 'DEGRADED' | 'FAILED' | 'QUARANTINED';

export type DeviceType = 'CPU' | 'GPU' | 'NPU' | 'REJECT';

export type OperatingMode = 'BALANCED' | 'PERFORMANCE' | 'CONSERVATIVE' | 'RESOURCE_SAVER';

export type DegradedMode =
  | 'FULL_CAPABILITY'
  | 'REDUCED_GPU'
  | 'CPU_ONLY'
  | 'NO_LLM'
  | 'NO_VISION'
  | 'NO_TTS'
  | 'EMERGENCY_RESOURCE_MODE';

export interface HardwareInventoryDTO {
  captured_at: number;
  os_name: string;
  os_version: string;
  os_build: string;
  cpu_model: string;
  cpu_physical_cores: number;
  cpu_logical_cores: number;
  cpu_utilization_percent: number;
  ram_total_mb: number;
  ram_available_mb: number;
  ram_used_mb: number;
  ram_utilization_percent: number;
  gpu_detected: boolean;
  gpu_model: string;
  gpu_vram_total_mb: number;
  gpu_vram_used_mb: number;
  gpu_vram_free_mb: number;
  gpu_utilization_percent: number;
  gpu_driver_version: string;
  gpu_cuda_version: string;
  gpu_temperature_c?: number;
  igpu_model?: string;
  npu_present: boolean;
  npu_status: string;
  storage_primary_total_mb: number;
  storage_primary_free_mb: number;
}

export interface ResourceLedgerEntryDTO {
  resource_type: ResourceType;
  unit: string;
  total: number;
  reserved: number;
  allocated: number;
  free: number;
  requested: number;
  denied_count: number;
  released_count: number;
}

export interface ResourceLeaseDTO {
  lease_id: string;
  owner_type: string;
  owner_id: string;
  resource_type: ResourceType;
  requested_amount: number;
  granted_amount: number;
  created_at: number;
  expires_at: number;
  priority: number;
  state: string;
  metadata: Record<string, any>;
}

export interface ModelInstanceRecordDTO {
  instance_id: string;
  model_id: string;
  model_tag: string;
  model_digest: string;
  format: string;
  quantization: string;
  parameter_count: string;
  context_length: number;
  runtime: string;
  state: ModelRuntimeState;
  health: ModelHealthState;
  device: DeviceType;
  loaded_at?: number;
  last_used?: number;
  use_count: number;
  estimated_memory_mb: number;
  actual_memory_mb?: number;
  prompt_tokens_processed: number;
  generated_tokens_produced: number;
  estimated_kv_cache_mb: number;
  is_production: boolean;
  is_candidate: boolean;
  is_warm: boolean;
  failure_count: number;
  quarantine_reason?: string;
  error_message?: string;
}

export interface WorkerProcessRecordDTO {
  pid: number;
  ppid: number;
  worker_id: string;
  worker_type: string;
  task_id?: string;
  execution_id?: string;
  process_name: string;
  state: string;
  cpu_percent: number;
  memory_mb: number;
  start_time: number;
  last_heartbeat: number;
}

export interface ResourceSummaryDTO {
  operating_mode: OperatingMode;
  degraded_mode: DegradedMode;
  pressure_level: ResourcePressureLevel;
  hardware: HardwareInventoryDTO;
  ledger: Record<string, ResourceLedgerEntryDTO>;
  active_leases_count: number;
  loaded_models_count: number;
  active_workers_count: number;
  models: ModelInstanceRecordDTO[];
  workers: WorkerProcessRecordDTO[];
  active_leases: ResourceLeaseDTO[];
}
