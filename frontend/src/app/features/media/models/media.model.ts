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

// Phase 8 Stage 8.4 — Multimodal Media Workflow Composer Models

export type WorkflowMediaPortType = 'TEXT' | 'IMAGE' | 'MASK' | 'VIDEO' | 'AUDIO' | 'SUBTITLES' | 'METADATA' | 'ANY';

export type MediaWorkflowStatus = 'QUEUED' | 'ADMITTED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'FAILED' | 'RECOVERED';

export type WorkflowNodeStatus = 'PENDING' | 'WAITING_INPUTS' | 'ACQUIRING_RESOURCES' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'CANCELLED';

export type WorkflowRetentionPolicy = 'KEEP_ALL' | 'KEEP_FINAL_AND_SOURCES' | 'KEEP_FINAL_ONLY';

export type MediaCompositionProfile =
  | 'VIDEO_ONLY'
  | 'VIDEO_PLUS_AUDIO'
  | 'VIDEO_PLUS_AUDIO_SUBTITLES'
  | 'IMAGE_SEQUENCE_TO_VIDEO';

export interface MediaWorkflowEdge {
  edge_id?: string;
  source_node_id: string;
  source_output_key: string;
  target_node_id: string;
  target_input_key: string;
  port_type: WorkflowMediaPortType;
}

export interface MediaWorkflowNode {
  node_id: string;
  title: string;
  skill_id: string;
  skill_version?: string;
  parameters: Record<string, any>;
  input_bindings?: Record<string, string>;
  output_bindings?: Record<string, string>;
  dependencies?: string[];
  status?: WorkflowNodeStatus;
  job_id?: string | null;
  output_artifact_id?: string | null;
  output_path?: string | null;
  output_sha256?: string | null;
  result_data?: Record<string, any>;
  error_message?: string | null;
  started_at?: number | null;
  completed_at?: number | null;
  duration_ms?: number;
  estimated_vram_mb?: number;
  estimated_ram_mb?: number;
}

export interface MediaWorkflowSuccessContract {
  required_output_keys?: string[];
  required_media_types?: WorkflowMediaPortType[];
  require_hash_verification?: boolean;
  minimum_completed_nodes?: number;
}

export interface MediaWorkflow {
  workflow_id: string;
  task_id?: string | null;
  execution_id?: string | null;
  title: string;
  goal: string;
  version?: number;
  nodes: Record<string, MediaWorkflowNode> | MediaWorkflowNode[];
  edges: MediaWorkflowEdge[];
  template_id?: string | null;
  resource_budget?: Record<string, number>;
  policy_profile?: Record<string, any>;
  retention_policy?: WorkflowRetentionPolicy;
  success_contract?: MediaWorkflowSuccessContract;
  status?: MediaWorkflowStatus;
  current_node_id?: string | null;
  progress?: number;
  created_at?: number;
  started_at?: number | null;
  completed_at?: number | null;
  failure_reason?: string | null;
  primary_artifact_id?: string | null;
  intermediate_artifact_ids?: string[];
  provenance?: string;
}

export interface MediaWorkflowSimulationResult {
  workflow_id: string;
  workflow_hash: string;
  node_count: number;
  estimated_duration_sec: number;
  peak_vram_mb: number;
  peak_ram_mb: number;
  estimated_storage_mb: number;
  required_skills: string[];
  required_models: string[];
  bottlenecks: string[];
  feasible: boolean;
  warnings: string[];
  provenance: string;
}

export interface MediaWorkflowTemplate {
  template_id: string;
  title: string;
  description: string;
  version: string;
  category: string;
  tags?: string[];
  nodes: Record<string, MediaWorkflowNode>;
  edges: MediaWorkflowEdge[];
  default_inputs?: Record<string, any>;
  is_builtin: boolean;
}

export interface MediaWorkflowManifest {
  manifest_id: string;
  workflow_id: string;
  workflow_hash: string;
  title: string;
  goal: string;
  primary_artifact_id?: string | null;
  artifacts: Array<{
    node_id?: string;
    artifact_id: string;
    media_type: string;
    filename: string;
    sha256: string;
    size_bytes: number;
    model_id: string;
  }>;
  lineage_records?: Array<Record<string, any>>;
  nodes_executed: string[];
  resource_summary: Record<string, any>;
  verification_passed: boolean;
  created_at: number;
  completed_at: number;
}

export interface MediaCompositionRequestDTO {
  video_artifact_id: string;
  audio_artifact_id?: string | null;
  subtitle_text?: string | null;
  profile: MediaCompositionProfile;
  output_format?: VideoFormat;
  output_filename?: string | null;
}

