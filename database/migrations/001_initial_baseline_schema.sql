-- ==========================================================================
-- ABHI System Relational Database - Initial Baseline Schema (Version 001)
-- Generated from canonical: database/relational/system.db
-- Engine: SQLite WAL Mode (WAL, synchronous=NORMAL, foreign_keys=ON)
-- ==========================================================================

-- [TABLE] artifact_lineage
CREATE TABLE artifact_lineage (
	lineage_id VARCHAR(64) NOT NULL, 
	parent_artifact_id VARCHAR(64) NOT NULL, 
	child_artifact_id VARCHAR(64) NOT NULL, 
	job_id VARCHAR(64) NOT NULL, 
	operation VARCHAR(32) NOT NULL, 
	mask_artifact_id VARCHAR(64), 
	prompt TEXT NOT NULL, 
	model_id VARCHAR(64) NOT NULL, 
	model_version VARCHAR(16), 
	parameters_hash VARCHAR(64) NOT NULL, 
	diff_evidence_json TEXT, 
	created_at FLOAT NOT NULL, 
	PRIMARY KEY (lineage_id)
);

-- [TABLE] brain_metaparameters
CREATE TABLE brain_metaparameters (
            id TEXT PRIMARY KEY,
            version TEXT NOT NULL,
            alignment_score REAL NOT NULL,
            system_prompt TEXT NOT NULL,
            temperature REAL NOT NULL,
            empathy_bias REAL NOT NULL,
            conciseness_ratio REAL NOT NULL,
            reasoning_depth TEXT NOT NULL,
            autonomous_threshold REAL NOT NULL,
            updated_at TEXT NOT NULL
        );

-- [TABLE] brain_upgrade_history
CREATE TABLE brain_upgrade_history (
            upgrade_id TEXT PRIMARY KEY,
            from_version TEXT NOT NULL,
            to_version TEXT NOT NULL,
            alignment_score REAL NOT NULL,
            decisions_evaluated INTEGER NOT NULL,
            parameter_diff TEXT NOT NULL,
            upgrade_rationale TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

-- [TABLE] communications_inbox
CREATE TABLE communications_inbox (
            message_id TEXT PRIMARY KEY,
            channel TEXT NOT NULL,
            sender TEXT NOT NULL,
            recipient TEXT NOT NULL,
            subject TEXT,
            body TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            reply_status TEXT DEFAULT 'pending',
            suggested_replies TEXT DEFAULT '[]',
            selected_reply TEXT,
            sent_at TEXT
        , category TEXT DEFAULT 'all', amount_inr REAL, utr TEXT, otp_code TEXT, account TEXT);

-- [TABLE] decision_traces
CREATE TABLE decision_traces (
	trace_id VARCHAR(64) NOT NULL, 
	use_case_id VARCHAR(64) NOT NULL, 
	confidence DOUBLE NOT NULL, 
	score_label VARCHAR(64) NOT NULL, 
	score_value DOUBLE NOT NULL, 
	decision_verdict VARCHAR(32) NOT NULL, 
	target_action VARCHAR(64) NOT NULL, 
	destination_worker VARCHAR(64) NOT NULL, 
	active_path JSON NOT NULL, 
	latency_ms DOUBLE NOT NULL, 
	input_payload JSON NOT NULL, 
	log_entries JSON NOT NULL, 
	output_result JSON NOT NULL, 
	operator_override BOOLEAN NOT NULL, 
	jev_utility DOUBLE NOT NULL, 
	state_vector_dims INTEGER NOT NULL, 
	spend_cost DOUBLE NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (trace_id)
);

-- [TABLE] episodic_memories
CREATE TABLE episodic_memories (
	memory_id VARCHAR(64) NOT NULL, 
	task_id VARCHAR(64), 
	category VARCHAR(64) NOT NULL, 
	context_summary TEXT NOT NULL, 
	solution_summary TEXT NOT NULL, 
	outcome VARCHAR(32) NOT NULL, 
	tags VARCHAR(255), 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (memory_id)
);

-- [TABLE] media_artifacts
CREATE TABLE media_artifacts (
	artifact_id VARCHAR(64) NOT NULL, 
	job_id VARCHAR(64) NOT NULL, 
	media_type VARCHAR(16) NOT NULL, 
	path VARCHAR(256) NOT NULL, 
	filename VARCHAR(128) NOT NULL, 
	format VARCHAR(8), 
	width INTEGER NOT NULL, 
	height INTEGER NOT NULL, 
	size_bytes INTEGER NOT NULL, 
	sha256 VARCHAR(64) NOT NULL, 
	model_id VARCHAR(64) NOT NULL, 
	model_version VARCHAR(16), 
	generation_parameters_hash VARCHAR(64) NOT NULL, 
	prompt_preview VARCHAR(256), 
	created_at FLOAT NOT NULL, 
	provenance VARCHAR(16), 
	PRIMARY KEY (artifact_id)
);

-- [TABLE] media_generation_metadata
CREATE TABLE media_generation_metadata (
	id INTEGER NOT NULL, 
	artifact_id VARCHAR(64) NOT NULL, 
	prompt_hash VARCHAR(64) NOT NULL, 
	generation_parameters_json TEXT NOT NULL, 
	vram_peak_mb FLOAT, 
	ram_peak_mb FLOAT, 
	duration_ms INTEGER, 
	provenance VARCHAR(16), 
	PRIMARY KEY (id)
);

-- [TABLE] media_jobs
CREATE TABLE media_jobs (
	job_id VARCHAR(64) NOT NULL, 
	task_id VARCHAR(64), 
	execution_id VARCHAR(64), 
	media_type VARCHAR(16) NOT NULL, 
	operation VARCHAR(16) NOT NULL, 
	prompt TEXT NOT NULL, 
	negative_prompt TEXT, 
	model_id VARCHAR(64) NOT NULL, 
	model_version VARCHAR(16), 
	status VARCHAR(32) NOT NULL, 
	progress FLOAT, 
	current_phase VARCHAR(32), 
	width INTEGER, 
	height INTEGER, 
	steps INTEGER, 
	seed INTEGER, 
	output_format VARCHAR(8), 
	device VARCHAR(8), 
	created_at FLOAT NOT NULL, 
	started_at FLOAT, 
	completed_at FLOAT, 
	failure_reason TEXT, 
	artifact_id VARCHAR(64), 
	output_path VARCHAR(256), 
	duration_ms INTEGER, 
	provenance VARCHAR(16), 
	PRIMARY KEY (job_id)
);

-- [TABLE] media_masks
CREATE TABLE media_masks (
	mask_id VARCHAR(64) NOT NULL, 
	source_artifact_id VARCHAR(64) NOT NULL, 
	path VARCHAR(256) NOT NULL, 
	filename VARCHAR(128) NOT NULL, 
	format VARCHAR(8), 
	width INTEGER NOT NULL, 
	height INTEGER NOT NULL, 
	size_bytes INTEGER NOT NULL, 
	sha256 VARCHAR(64) NOT NULL, 
	semantics VARCHAR(32), 
	editable_pixel_count INTEGER, 
	editable_ratio FLOAT, 
	created_at FLOAT NOT NULL, 
	provenance VARCHAR(16), 
	PRIMARY KEY (mask_id)
);

-- [TABLE] media_workflow_checkpoints
CREATE TABLE media_workflow_checkpoints (
	checkpoint_id VARCHAR(64) NOT NULL, 
	workflow_id VARCHAR(64) NOT NULL, 
	node_id VARCHAR(64) NOT NULL, 
	status VARCHAR(32), 
	artifacts_json TEXT, 
	resource_state_json TEXT, 
	workflow_version VARCHAR(16), 
	timestamp FLOAT NOT NULL, 
	PRIMARY KEY (checkpoint_id)
);

-- [TABLE] media_workflow_templates
CREATE TABLE media_workflow_templates (
	template_id VARCHAR(64) NOT NULL, 
	name VARCHAR(128) NOT NULL, 
	version VARCHAR(16), 
	description TEXT, 
	category VARCHAR(32), 
	workflow_json TEXT NOT NULL, 
	created_at FLOAT NOT NULL, 
	PRIMARY KEY (template_id)
);

-- [TABLE] media_workflows
CREATE TABLE media_workflows (
	workflow_id VARCHAR(64) NOT NULL, 
	task_id VARCHAR(64), 
	execution_id VARCHAR(64), 
	goal TEXT NOT NULL, 
	version VARCHAR(16), 
	nodes_json TEXT NOT NULL, 
	edges_json TEXT NOT NULL, 
	inputs_json TEXT, 
	outputs_json TEXT, 
	resource_budget_json TEXT, 
	policy_profile_json TEXT, 
	status VARCHAR(32) NOT NULL, 
	created_at FLOAT NOT NULL, 
	started_at FLOAT, 
	completed_at FLOAT, 
	error_message TEXT, 
	workflow_hash VARCHAR(64), 
	PRIMARY KEY (workflow_id)
);

-- [TABLE] operator_biometrics
CREATE TABLE operator_biometrics (operator_id TEXT PRIMARY KEY, name TEXT, embedding_json TEXT, enrolled_at REAL, last_verified_at REAL);

-- [TABLE] security_audit_log
CREATE TABLE security_audit_log (id TEXT PRIMARY KEY, incident_type TEXT, timestamp REAL, confidence REAL, match_score REAL, snapshot_filename TEXT, notes TEXT);

-- [TABLE] task_executions
CREATE TABLE task_executions (
	task_id VARCHAR(64) NOT NULL, 
	goal TEXT NOT NULL, 
	state VARCHAR(32) NOT NULL, 
	dag_data JSON NOT NULL, 
	error_message TEXT, 
	duration_ms INTEGER, 
	created_at DATETIME NOT NULL, 
	completed_at DATETIME, 
	PRIMARY KEY (task_id)
);

-- [TABLE] user_communications_profile
CREATE TABLE user_communications_profile (
            id TEXT PRIMARY KEY,
            email TEXT,
            phone_number TEXT,
            whatsapp_enabled INTEGER DEFAULT 1,
            auto_reply_mode TEXT DEFAULT 'HUMAN_CONFIRMATION',
            monitored_threads TEXT DEFAULT '[]',
            created_at TEXT,
            updated_at TEXT
        );

-- [TABLE] user_profiles
CREATE TABLE user_profiles (
	"key" VARCHAR(128) NOT NULL, 
	value_json JSON NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY ("key")
);

-- [TABLE] video_artifacts
CREATE TABLE video_artifacts (
	artifact_id VARCHAR(64) NOT NULL, 
	job_id VARCHAR(64) NOT NULL, 
	path VARCHAR(256) NOT NULL, 
	filename VARCHAR(128) NOT NULL, 
	format VARCHAR(8), 
	width INTEGER NOT NULL, 
	height INTEGER NOT NULL, 
	fps INTEGER NOT NULL, 
	duration_seconds FLOAT NOT NULL, 
	frame_count INTEGER NOT NULL, 
	size_bytes INTEGER NOT NULL, 
	sha256 VARCHAR(64) NOT NULL, 
	poster_path VARCHAR(256), 
	model_id VARCHAR(64) NOT NULL, 
	model_version VARCHAR(16), 
	generation_parameters_hash VARCHAR(64) NOT NULL, 
	prompt_preview VARCHAR(256), 
	created_at FLOAT NOT NULL, 
	provenance VARCHAR(16), 
	PRIMARY KEY (artifact_id)
);

-- [TABLE] video_jobs
CREATE TABLE video_jobs (
	job_id VARCHAR(64) NOT NULL, 
	task_id VARCHAR(64), 
	execution_id VARCHAR(64), 
	prompt TEXT NOT NULL, 
	negative_prompt TEXT, 
	model_id VARCHAR(64) NOT NULL, 
	model_version VARCHAR(16), 
	status VARCHAR(32) NOT NULL, 
	progress FLOAT, 
	current_phase VARCHAR(32), 
	width INTEGER, 
	height INTEGER, 
	fps INTEGER, 
	duration_seconds FLOAT, 
	steps INTEGER, 
	seed INTEGER, 
	output_format VARCHAR(8), 
	device VARCHAR(8), 
	created_at FLOAT NOT NULL, 
	started_at FLOAT, 
	completed_at FLOAT, 
	failure_reason TEXT, 
	artifact_id VARCHAR(64), 
	output_path VARCHAR(256), 
	duration_ms INTEGER, 
	provenance VARCHAR(16), 
	PRIMARY KEY (job_id)
);

-- [TABLE] video_segments
CREATE TABLE video_segments (
	segment_id VARCHAR(64) NOT NULL, 
	job_id VARCHAR(64) NOT NULL, 
	segment_index INTEGER NOT NULL, 
	frame_start INTEGER NOT NULL, 
	frame_end INTEGER NOT NULL, 
	frame_count INTEGER NOT NULL, 
	sha256 VARCHAR(64), 
	temp_path VARCHAR(256), 
	status VARCHAR(32), 
	created_at FLOAT NOT NULL, 
	verified BOOLEAN, 
	PRIMARY KEY (segment_id)
);

-- [INDEX] idx_brain_upgrade_ts
CREATE INDEX idx_brain_upgrade_ts ON brain_upgrade_history (created_at DESC);

-- [INDEX] idx_comm_inbox_ch_ts
CREATE INDEX idx_comm_inbox_ch_ts ON communications_inbox (channel, timestamp DESC);

-- [INDEX] idx_comm_inbox_reply_status
CREATE INDEX idx_comm_inbox_reply_status ON communications_inbox (reply_status);

-- [INDEX] ix_artifact_lineage_child_artifact_id
CREATE INDEX ix_artifact_lineage_child_artifact_id ON artifact_lineage (child_artifact_id);

-- [INDEX] ix_artifact_lineage_job_id
CREATE INDEX ix_artifact_lineage_job_id ON artifact_lineage (job_id);

-- [INDEX] ix_artifact_lineage_lineage_id
CREATE INDEX ix_artifact_lineage_lineage_id ON artifact_lineage (lineage_id);

-- [INDEX] ix_artifact_lineage_parent_artifact_id
CREATE INDEX ix_artifact_lineage_parent_artifact_id ON artifact_lineage (parent_artifact_id);

-- [INDEX] ix_decision_traces_trace_id
CREATE INDEX ix_decision_traces_trace_id ON decision_traces (trace_id);

-- [INDEX] ix_decision_traces_use_case_id
CREATE INDEX ix_decision_traces_use_case_id ON decision_traces (use_case_id);

-- [INDEX] ix_episodic_memories_memory_id
CREATE INDEX ix_episodic_memories_memory_id ON episodic_memories (memory_id);

-- [INDEX] ix_episodic_memories_task_id
CREATE INDEX ix_episodic_memories_task_id ON episodic_memories (task_id);

-- [INDEX] ix_media_artifacts_artifact_id
CREATE INDEX ix_media_artifacts_artifact_id ON media_artifacts (artifact_id);

-- [INDEX] ix_media_artifacts_job_id
CREATE INDEX ix_media_artifacts_job_id ON media_artifacts (job_id);

-- [INDEX] ix_media_artifacts_sha256
CREATE UNIQUE INDEX ix_media_artifacts_sha256 ON media_artifacts (sha256);

-- [INDEX] ix_media_generation_metadata_artifact_id
CREATE INDEX ix_media_generation_metadata_artifact_id ON media_generation_metadata (artifact_id);

-- [INDEX] ix_media_jobs_job_id
CREATE INDEX ix_media_jobs_job_id ON media_jobs (job_id);

-- [INDEX] ix_media_jobs_status
CREATE INDEX ix_media_jobs_status ON media_jobs (status);

-- [INDEX] ix_media_jobs_status_created
CREATE INDEX ix_media_jobs_status_created ON media_jobs (status, created_at);

-- [INDEX] ix_media_jobs_task_id
CREATE INDEX ix_media_jobs_task_id ON media_jobs (task_id);

-- [INDEX] ix_media_masks_mask_id
CREATE INDEX ix_media_masks_mask_id ON media_masks (mask_id);

-- [INDEX] ix_media_masks_sha256
CREATE UNIQUE INDEX ix_media_masks_sha256 ON media_masks (sha256);

-- [INDEX] ix_media_masks_source_artifact_id
CREATE INDEX ix_media_masks_source_artifact_id ON media_masks (source_artifact_id);

-- [INDEX] ix_media_workflow_checkpoints_checkpoint_id
CREATE INDEX ix_media_workflow_checkpoints_checkpoint_id ON media_workflow_checkpoints (checkpoint_id);

-- [INDEX] ix_media_workflow_checkpoints_workflow_id
CREATE INDEX ix_media_workflow_checkpoints_workflow_id ON media_workflow_checkpoints (workflow_id);

-- [INDEX] ix_media_workflow_templates_template_id
CREATE INDEX ix_media_workflow_templates_template_id ON media_workflow_templates (template_id);

-- [INDEX] ix_media_workflows_status
CREATE INDEX ix_media_workflows_status ON media_workflows (status);

-- [INDEX] ix_media_workflows_status_created
CREATE INDEX ix_media_workflows_status_created ON media_workflows (status, created_at);

-- [INDEX] ix_media_workflows_task_id
CREATE INDEX ix_media_workflows_task_id ON media_workflows (task_id);

-- [INDEX] ix_media_workflows_workflow_hash
CREATE INDEX ix_media_workflows_workflow_hash ON media_workflows (workflow_hash);

-- [INDEX] ix_media_workflows_workflow_id
CREATE INDEX ix_media_workflows_workflow_id ON media_workflows (workflow_id);

-- [INDEX] ix_task_executions_task_id
CREATE INDEX ix_task_executions_task_id ON task_executions (task_id);

-- [INDEX] ix_user_profiles_key
CREATE INDEX ix_user_profiles_key ON user_profiles ("key");

-- [INDEX] ix_video_artifacts_artifact_id
CREATE INDEX ix_video_artifacts_artifact_id ON video_artifacts (artifact_id);

-- [INDEX] ix_video_artifacts_job_id
CREATE INDEX ix_video_artifacts_job_id ON video_artifacts (job_id);

-- [INDEX] ix_video_artifacts_sha256
CREATE UNIQUE INDEX ix_video_artifacts_sha256 ON video_artifacts (sha256);

-- [INDEX] ix_video_jobs_job_id
CREATE INDEX ix_video_jobs_job_id ON video_jobs (job_id);

-- [INDEX] ix_video_jobs_status
CREATE INDEX ix_video_jobs_status ON video_jobs (status);

-- [INDEX] ix_video_jobs_status_created
CREATE INDEX ix_video_jobs_status_created ON video_jobs (status, created_at);

-- [INDEX] ix_video_jobs_task_id
CREATE INDEX ix_video_jobs_task_id ON video_jobs (task_id);

-- [INDEX] ix_video_segments_job_id
CREATE INDEX ix_video_segments_job_id ON video_segments (job_id);

-- [INDEX] ix_video_segments_segment_id
CREATE INDEX ix_video_segments_segment_id ON video_segments (segment_id);
