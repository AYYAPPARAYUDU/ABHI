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
export type VideoFormat = 'MP4' | 'WEBM';
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

export interface VideoGenerationRequestDTO {
  prompt: string;
  negative_prompt?: string | null;
  model_id: string;
  width: number;
  height: number;
  fps: number;
  duration_seconds: number;
  steps: number;
  seed?: number | null;
  output_format: VideoFormat;
  quality_profile?: string;
  preferred_device?: string;
  chunk_duration_seconds?: number;
}

export interface VideoSegmentCheckpointDTO {
  segment_id: string;
  job_id: string;
  segment_index: number;
  frame_start: number;
  frame_end: number;
  frame_count: number;
  sha256?: string;
  temp_path?: string | null;
  status: string;
  created_at: number;
  verified: boolean;
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

export interface VideoArtifactDTO {
  artifact_id: string;
  job_id: string;
  media_type: string;
  path: string;
  filename: string;
  format: VideoFormat;
  width: number;
  height: number;
  fps: number;
  duration_seconds: number;
  frame_count: number;
  size_bytes: number;
  sha256: string;
  poster_path?: string | null;
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

export interface VideoModelDefinitionDTO {
  model_id: string;
  name: string;
  version: string;
  digest: string;
  runtime: string;
  format: string;
  quantization: string;
  supported_devices: string[];
  base_vram_mb: number;
  per_second_vram_mb: number;
  base_ram_mb: number;
  gpu_compute_percent: number;
  supported_resolutions: number[][];
  supported_fps: number[];
  max_duration_seconds: number;
  supported_operations: string[];
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

export type ImageEditType = 'IMAGE_TO_IMAGE' | 'INPAINTING' | 'OUTPAINTING';
export type MaskSemantics = 'WHITE_EDIT_BLACK_PRESERVE' | 'ALPHA_TRANSPARENT_EDIT';

export interface OutpaintBoundsDTO {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface MaskArtifactDTO {
  mask_id: string;
  source_artifact_id: string;
  path: string;
  filename: string;
  format: string;
  width: number;
  height: number;
  size_bytes: number;
  sha256: string;
  created_at: number;
  mask_semantics: MaskSemantics;
  edit_area_ratio: number;
  provenance: string;
}

export interface EditDifferenceEvidenceDTO {
  changed_pixel_count: number;
  changed_pixel_ratio: number;
  bounding_box?: number[] | null;
  source_dimensions: number[];
  output_dimensions: number[];
  mask_overlap_ratio?: number | null;
  evaluation_method: string;
}

export interface ImageEditRequestDTO {
  source_artifact_id: string;
  operation: ImageEditType;
  prompt: string;
  negative_prompt?: string | null;
  model_id: string;
  mask_artifact_id?: string | null;
  mask_base64?: string | null;
  strength?: number;
  width?: number | null;
  height?: number | null;
  steps?: number;
  guidance?: number;
  seed?: number | null;
  output_format?: ImageFormat;
  quality_profile?: QualityProfile;
  preferred_device?: string;
  outpaint_bounds?: OutpaintBoundsDTO | null;
}

export interface ArtifactLineageRecordDTO {
  lineage_id: string;
  parent_artifact_id: string;
  child_artifact_id: string;
  job_id: string;
  operation: ImageEditType;
  mask_artifact_id?: string | null;
  prompt: string;
  model_id: string;
  model_version: string;
  parameters_hash: string;
  difference_evidence?: EditDifferenceEvidenceDTO | null;
  created_at: number;
}

export interface ImageEditModelDefinitionDTO {
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
  supported_operations: ImageEditType[];
  max_expansion_pixels: number;
  capabilities: string[];
  license_metadata: string;
  source: string;
  status: string;
  is_production: boolean;
  is_candidate: boolean;
}
