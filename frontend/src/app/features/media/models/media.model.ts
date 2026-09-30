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

// ==========================================
// Phase 8 Stage 8.5 — Creative Production Models
// ==========================================

export type CreativePipelineType =
  | 'SHORT_PROMOTIONAL_VIDEO'
  | 'NARRATED_IMAGE_STORY'
  | 'SOCIAL_MEDIA_CLIP'
  | 'PRESENTATION_VISUAL'
  | 'CINEMATIC_SCENE'
  | 'PHOTO_TO_VIDEO'
  | 'CUSTOM';

export type CreativePipelineStatus =
  | 'DRAFT'
  | 'PLANNING'
  | 'ASSET_GENERATION'
  | 'SCENE_GENERATION'
  | 'NARRATION'
  | 'COMPOSITION'
  | 'RENDERING'
  | 'VALIDATING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REVISING';

export type CreativeAssetType = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'TEXT' | 'SUBTITLE';
export type SubtitleFormat = 'SRT' | 'VTT';
export type RenderProfile = 'MP4_H264_STANDARD' | 'MP4_H264_LOW_RESOURCE' | 'WEBM_STANDARD';
export type PipelineRetentionPolicy = 'FINAL_ONLY' | 'FINAL_PLUS_SOURCES' | 'FULL_PROJECT';

export interface CreativeBrief {
  title: string;
  description: string;
  style?: string;
  tone?: string;
  language?: string;
  duration?: number;
  aspect_ratio?: string;
  resolution?: [number, number];
  target_format?: string;
  audience?: string;
  visual_requirements?: string[];
  audio_requirements?: string[];
  text_requirements?: string[];
  constraints?: string[];
}

export interface NarrationSegment {
  segment_id: string;
  scene_id: string;
  speaker: string;
  text: string;
  estimated_duration_s?: number;
  actual_duration_s?: number;
  audio_artifact_id?: string | null;
}

export interface CreativeScript {
  script_id: string;
  title: string;
  language: string;
  narration_segments: NarrationSegment[];
  on_screen_text: string[];
  total_estimated_duration_s: number;
}

export interface StoryboardScene {
  scene_id: string;
  sequence: number;
  duration: number;
  visual_prompt: string;
  camera_motion?: string;
  narration_text?: string;
  on_screen_text?: string;
  transition?: string;
}

export interface Storyboard {
  storyboard_id: string;
  scenes: StoryboardScene[];
}

export interface Scene {
  scene_id: string;
  order: number;
  duration: number;
  visual_prompt: string;
  image_artifact_id?: string | null;
  video_artifact_id?: string | null;
  audio_artifact_id?: string | null;
  transition: string;
  status: string;
}

export interface CreativeAsset {
  asset_id: string;
  asset_type: CreativeAssetType;
  artifact_id: string;
  source: string;
  model_id?: string | null;
  model_digest?: string | null;
  runtime?: string | null;
  parent_assets?: string[];
  created_at?: number;
  sha256?: string;
  metadata?: Record<string, any>;
}

export interface SubtitleSegment {
  index: number;
  start_time_s: number;
  end_time_s: number;
  text: string;
}

export interface SubtitleTrack {
  track_id: string;
  language: string;
  format: SubtitleFormat;
  segments: SubtitleSegment[];
  raw_content?: string;
  artifact_id?: string | null;
}

export interface TimelineClip {
  clip_id: string;
  track_id: string;
  start_time_s: number;
  duration_s: number;
  source_artifact_id: string;
  media_type: CreativeAssetType;
  transition?: string;
  layer: number;
}

export interface TimelineTrack {
  track_id: string;
  name: string;
  track_type: CreativeAssetType;
  clips: TimelineClip[];
}

export interface MediaTimeline {
  timeline_id: string;
  total_duration_s: number;
  tracks: TimelineTrack[];
}

export interface PipelineQualityScore {
  technical_integrity: number;
  resource_efficiency: number;
  workflow_completion: number;
  prompt_adherence: number;
  temporal_consistency: number;
  audio_video_alignment: number;
  overall_passed: boolean;
  notes?: string[];
}

export interface CreativePipeline {
  pipeline_id: string;
  task_id?: string;
  execution_id?: string;
  goal: string;
  pipeline_type: CreativePipelineType;
  version: string;
  creative_brief: CreativeBrief;
  script?: CreativeScript | null;
  storyboard?: Storyboard | null;
  scenes: Scene[];
  assets: CreativeAsset[];
  subtitle_tracks: SubtitleTrack[];
  timeline?: MediaTimeline | null;
  workflow_id?: string | null;
  outputs: Array<Record<string, any>>;
  status: CreativePipelineStatus;
  quality_report?: PipelineQualityScore | null;
  resource_budget: Record<string, any>;
  storage_budget: Record<string, any>;
  retention_policy: PipelineRetentionPolicy;
  render_profile: RenderProfile;
  pipeline_hash: string;
  created_at: number;
  started_at?: number | null;
  completed_at?: number | null;
  error_message?: string | null;
}

export interface CreativePipelineTemplate {
  template_id: string;
  title: string;
  description: string;
  pipeline_type: CreativePipelineType;
  default_brief: Record<string, any>;
  version: string;
  is_builtin: boolean;
}

export interface CreativeProjectManifest {
  manifest_id: string;
  pipeline_id: string;
  pipeline_hash: string;
  title: string;
  pipeline_type: string;
  version: string;
  creative_brief: CreativeBrief;
  script?: CreativeScript | null;
  storyboard?: Storyboard | null;
  scenes: Scene[];
  assets: CreativeAsset[];
  models: string[];
  artifacts: Array<Record<string, any>>;
  timeline?: MediaTimeline | null;
  subtitles: SubtitleTrack[];
  quality_report?: PipelineQualityScore | null;
  resource_summary: Record<string, any>;
  verification_passed: boolean;
  created_at: number;
}

export interface CreativeRevisionRequest {
  scene_id: string;
  new_visual_prompt?: string;
  new_duration?: number;
  new_narration_text?: string;
  reason?: string;
}

// ==========================================
// Phase 8 Stage 8.6: Provenance & Reliability
// ==========================================

export type ProvenanceClass =
  | 'ACTUAL_MODEL_INFERENCE'
  | 'PROCEDURAL'
  | 'SIMULATED'
  | 'MOCKED'
  | 'ESTIMATED'
  | 'MEASURED';

export type ResourceProvenance =
  | 'ACTUAL'
  | 'MEASURED'
  | 'ESTIMATED'
  | 'SIMULATED'
  | 'MOCKED';

export type EvaluationDimensionStatus =
  | 'PASS'
  | 'FAIL'
  | 'NOT_EVALUATED'
  | 'INCONCLUSIVE';

export type ReplayMode = 'INSPECT' | 'SIMULATE' | 'REPLAY';

export type TechnicalValidationStatus = 'VALID' | 'INVALID' | 'DEGRADED' | 'UNKNOWN' | 'PASS' | 'FAIL';

export interface MediaRuntimeAttestation {
  attestation_id: string;
  operation_id: string;
  artifact_id: string;
  operation_type: string;
  model_id?: string | null;
  model_digest?: string | null;
  runtime_name: string;
  runtime_version: string;
  adapter_version: string;
  device: string;
  driver_version?: string | null;
  compute_runtime?: string | null;
  provenance_class: ProvenanceClass;
  precision?: string | null;
  quantization?: string | null;
  parameters_hash: string;
  input_hashes: string[];
  output_hashes: string[];
  seed?: number | null;
  started_at: number | string;
  completed_at: number | string;
  attestation_hash: string;
}

export interface ResourceMeasurementEvidence {
  peak_vram_mb: number;
  vram_provenance: ResourceProvenance;
  peak_ram_mb: number;
  ram_provenance: ResourceProvenance;
  gpu_utilization_pct: number;
  cpu_utilization_pct: number;
  storage_peak_bytes: number;
  resource_wait_time_ms: number;
  model_load_time_ms: number;
  model_switch_count: number;
}

export interface TechnicalValidationCheck {
  check_name: string;
  passed: boolean;
  status?: TechnicalValidationStatus;
  detail: string;
  measured_value?: any;
  expected_value?: any;
}

export interface TechnicalValidationResult {
  artifact_id?: string;
  media_type?: string;
  is_valid?: boolean;
  status: TechnicalValidationStatus;
  checks: TechnicalValidationCheck[];
  measured_sha256?: string;
  measured_dimensions?: [number, number];
  measured_duration_seconds?: number;
  measured_fps?: number;
  duration_s?: number | null;
  resolution_actual?: [number, number] | null;
  fps_actual?: number | null;
  frame_count_actual?: number | null;
  codec_actual?: string | null;
  audio_channels_actual?: number | null;
  sample_rate_actual?: number | null;
  subtitle_segment_count?: number | null;
  file_size_bytes?: number;
  sha256_actual?: string;
  lineage_verified?: boolean;
  manifest_link_verified?: boolean;
  validated_at?: string;
  errors?: string[];
  warnings?: string[];
}

export interface CreativeQualityEvidence {
  evaluation_id?: string;
  project_id?: string;
  prompt_adherence: EvaluationDimensionStatus;
  prompt_adherence_status?: EvaluationDimensionStatus;
  prompt_adherence_score?: number | null;
  prompt_keyword_coverage?: number | null;
  visual_coherence: EvaluationDimensionStatus;
  visual_coherence_status?: EvaluationDimensionStatus;
  visual_coherence_score?: number | null;
  temporal_coherence: EvaluationDimensionStatus;
  temporal_coherence_status?: EvaluationDimensionStatus;
  temporal_coherence_score?: number | null;
  style_consistency: EvaluationDimensionStatus;
  style_consistency_status?: EvaluationDimensionStatus;
  style_consistency_score?: number | null;
  narrative_alignment: EvaluationDimensionStatus;
  narrative_alignment_score?: number | null;
  audio_alignment: EvaluationDimensionStatus;
  audio_alignment_status?: EvaluationDimensionStatus;
  audio_alignment_score?: number | null;
  alignment_delta_seconds?: number | null;
  subtitle_correctness: EvaluationDimensionStatus;
  subtitle_correctness_score?: number | null;
  subtitle_coverage_ratio?: number | null;
  evaluator_metadata?: Record<string, any>;
  evaluated_at?: string;
  notes?: string[];
}

export interface ReplayDiscrepancy {
  field: string;
  recorded_value: any;
  current_value: any;
  severity: 'WARNING' | 'ERROR' | 'BLOCKER';
  description: string;
  expected?: any;
  actual?: any;
  impact?: string;
}

export interface ReplayInspectionResult {
  pipeline_id: string;
  mode: ReplayMode;
  is_safe_to_execute?: boolean;
  can_replay?: boolean;
  schema_valid?: boolean;
  models_authenticated?: boolean;
  capabilities_available?: boolean;
  resource_feasible?: boolean;
  policy_compliant?: boolean;
  manifest_hash?: string;
  discrepancies: ReplayDiscrepancy[];
  node_inspections?: Array<Record<string, any>>;
  reusable_artifact_count: number;
  regenerate_node_count: number;
  estimated_duration_s?: number;
  estimated_peak_vram_mb?: number;
  inspection_timestamp?: number;
  inspected_at?: string;
}


