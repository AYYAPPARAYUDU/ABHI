export type MediaType = 'IMAGE' | 'VIDEO' | 'AUDIO';
export type MediaOperation = 'GENERATE' | 'EDIT' | 'VARIATION' | 'UPSCALE';
export type MediaJobStatus =
  | 'QUEUED'
  | 'ADMITTED'
  | 'LOADING_MODEL'
  | 'GENERATING'
  | 'VALIDATING'
  | 'STORING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED'
  | 'RESOURCE_DENIED'
  | 'QUARANTINED';

export type ImageFormat = 'PNG' | 'JPEG' | 'WEBP';
export type QualityProfile = 'DRAFT' | 'STANDARD' | 'HD' | 'ULTRA';

export interface ImageGenerationRequestDTO {
  prompt: string;
  negative_prompt?: string | null;
  model_id: string;
  width: number;
  height: number;
  steps: number;
  guidance?: number;
  seed?: number | null;
  batch_size?: number;
  output_format: ImageFormat;
  quality_profile?: QualityProfile;
  preferred_device?: string;
}

export interface MediaArtifactDTO {
  artifact_id: string;
  job_id: string;
  media_type: MediaType;
  path: string;
  filename: string;
  format: ImageFormat;
  width: number;
  height: number;
  size_bytes: number;
  sha256: string;
  created_at: number;
  model_id: string;
  model_version: string;
  generation_parameters_hash: string;
  prompt_preview: string;
  provenance: string;
}

export interface MediaJobDTO {
  job_id: string;
  task_id?: string | null;
  execution_id?: string | null;
  media_type: MediaType;
  operation: MediaOperation;
  prompt: string;
  negative_prompt?: string | null;
  model_id: string;
  model_version: string;
  parameters: Record<string, any>;
  status: MediaJobStatus;
  progress: number;
  current_phase: string;
  created_at: number;
  started_at?: number | null;
  completed_at?: number | null;
  failure_reason?: string | null;
  artifact_id?: string | null;
  output_path?: string | null;
  device?: string;
  duration_ms?: number | null;
  provenance: string;
}

export interface ImageModelDefinitionDTO {
  model_id: string;
  name: string;
  version: string;
  digest: string;
  runtime: string;
  format: string;
  quantization: string;
  supported_devices: string[];
  base_vram_mb: number;
  base_ram_mb: number;
  gpu_compute_percent: number;
  supported_resolutions: number[][];
  max_batch: number;
  capabilities: string[];
  license_metadata: string;
  source: string;
  status: string;
  is_production: boolean;
  is_candidate: boolean;
}

export interface MediaResourceStatusDTO {
  gpu_detected: boolean;
  gpu_model?: string;
  vram_total_mb?: number;
  vram_free_mb?: number;
  vram_ledger?: any;
  ram_ledger?: any;
  pressure_level: string;
  active_media_models: ImageModelDefinitionDTO[];
}
