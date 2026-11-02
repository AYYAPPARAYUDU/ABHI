import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MediaService } from '../../services/media.service';
import {
  MediaRuntimeAttestation,
  ProvenanceClass,
} from '../../models/media.model';

@Component({
  selector: 'app-media-provenance-inspector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './media-provenance-inspector.component.html',
  styleUrl: './media-provenance-inspector.component.css',
})
export class MediaProvenanceInspectorComponent implements OnInit {
  mediaService = inject(MediaService);

  activeTab = signal<'attestations' | 'validation' | 'quality' | 'replay'>('attestations');
  selectedAttestation = signal<MediaRuntimeAttestation | null>(null);

  // Validation Form inputs
  valArtifactId = 'art_scene_demo_01';
  valFilePath = 'data/artifacts/scene_demo_01.mp4';
  valMediaType = 'VIDEO';

  ngOnInit(): void {
    this.refreshData();
  }

  refreshData(): void {
    this.mediaService.fetchAttestations().subscribe({
      next: (list) => {
        if (list.length > 0 && !this.selectedAttestation()) {
          this.selectedAttestation.set(list[0]);
        }
      },
    });
  }

  selectAttestation(att: MediaRuntimeAttestation): void {
    this.selectedAttestation.set(att);
  }

  getProvenanceBadgeClass(pClass: ProvenanceClass | string): string {
    switch (pClass) {
      case 'ACTUAL_MODEL_INFERENCE':
        return 'badge-actual text-emerald-300';
      case 'PROCEDURAL':
        return 'badge-procedural text-cyan-300';
      case 'MEASURED':
        return 'badge-measured text-indigo-300';
      case 'SIMULATED':
      case 'ESTIMATED':
        return 'badge-simulated text-amber-300';
      case 'MOCKED':
        return 'badge-simulated text-purple-300';
      default:
        return 'badge-procedural text-slate-300';
    }
  }

  runValidation(): void {
    this.mediaService
      .validateMediaArtifact({
        artifact_id: this.valArtifactId,
        file_path: this.valFilePath,
        media_type: this.valMediaType,
      })
      .subscribe();
  }

  runQualityEvaluation(): void {
    this.mediaService
      .evaluateCreativeQuality({
        project_id: 'proj_sample_01',
        artifact_ids: ['art_img_01', 'art_vid_01'],
        prompt: 'Futuristic AI computer workstation in cyber laboratory',
        video_duration: 10.0,
        audio_duration: 9.8,
      })
      .subscribe();
  }

  inspectCurrentManifest(): void {
    const att = this.selectedAttestation();
    const manifest = att
      ? {
          pipeline_id: att.operation_id || 'pipeline_active',
          pipeline_version: '1.0.0',
          manifest_hash: att.attestation_hash || 'sha256_active',
          models_used: [att.model_id || 'abhi:latest'],
          model_digests: { [att.model_id || 'abhi:latest']: att.model_digest || 'sha256:verified' },
          nodes: [{ node_id: 'node_1', task_type: 'IMAGE_GENERATE', model_id: att.model_id || 'abhi:latest' }],
          artifacts: [{ artifact_id: att.artifact_id, file_path: `data/artifacts/${att.artifact_id}.png`, sha256_hash: att.output_hashes?.[0] || 'sha256:verified' }],
        }
      : {
          pipeline_id: 'pipeline_active',
          pipeline_version: '1.0.0',
          manifest_hash: 'sha256_active_manifest',
          models_used: ['abhi:latest'],
          model_digests: { 'abhi:latest': 'sha256:verified' },
          nodes: [{ node_id: 'node_1', task_type: 'IMAGE_GENERATE', model_id: 'abhi:latest' }],
          artifacts: [],
        };
    this.mediaService.inspectReplay(manifest).subscribe();
  }

  simulateCurrentManifest(): void {
    const att = this.selectedAttestation();
    const manifest = att
      ? {
          pipeline_id: att.operation_id || 'pipeline_active',
          pipeline_version: '1.0.0',
          manifest_hash: att.attestation_hash || 'sha256_active',
          models_used: [att.model_id || 'abhi:latest'],
          model_digests: { [att.model_id || 'abhi:latest']: att.model_digest || 'sha256:verified' },
          nodes: [{ node_id: 'node_1', task_type: 'IMAGE_GENERATE', model_id: att.model_id || 'abhi:latest' }],
          artifacts: [{ artifact_id: att.artifact_id, file_path: `data/artifacts/${att.artifact_id}.png`, sha256_hash: att.output_hashes?.[0] || 'sha256:verified' }],
        }
      : {
          pipeline_id: 'pipeline_active',
          pipeline_version: '1.0.0',
          manifest_hash: 'sha256_active_manifest',
          models_used: ['abhi:latest'],
          model_digests: { 'abhi:latest': 'sha256:verified' },
          nodes: [{ node_id: 'node_1', task_type: 'IMAGE_GENERATE', model_id: 'abhi:latest' }],
          artifacts: [],
        };
    this.mediaService.simulateReplay(manifest).subscribe();
  }
}
