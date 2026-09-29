import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaJobDTO } from '../../models/media.model';

@Component({
  selector: 'app-video-job-queue',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card bg-dark border-secondary text-light h-100">
      <div class="card-header border-secondary d-flex justify-content-between align-items-center">
        <h6 class="mb-0 text-info">
          <i class="bi bi-stack me-2"></i>Video Job Queue & Live Chunk Progress
        </h6>
        <span class="badge bg-secondary">{{ jobs.length }} Total</span>
      </div>
      <div class="card-body p-0">
        <!-- Active Job Chunk Progress Panel -->
        <div *ngIf="activeJob" class="p-3 bg-black border-bottom border-secondary">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="fw-bold small text-info">{{ activeJob.job_id }}</span>
            <span [ngClass]="getStatusBadgeClass(activeJob.status)">
              {{ activeJob.status }}
            </span>
          </div>

          <p class="small text-secondary mb-2 text-truncate">
            {{ activeJob.prompt }}
          </p>

          <div class="progress mb-2" style="height: 10px;">
            <div
              class="progress-bar progress-bar-striped progress-bar-animated bg-info"
              role="progressbar"
              [style.width.%]="activeJob.progress"
            ></div>
          </div>

          <div class="d-flex justify-content-between small text-secondary mb-2">
            <span>Phase: <strong class="text-light">{{ activeJob.current_phase }}</strong></span>
            <span>Progress: <strong>{{ activeJob.progress | number: '1.0-0' }}%</strong></span>
          </div>

          <!-- Chunk/Segment Progress Visualization -->
          <div *ngIf="activeJob.status === 'GENERATING'" class="p-2 rounded bg-dark border border-secondary mb-2">
            <div class="small fw-bold text-info mb-1">
              <i class="bi bi-cpu me-1"></i>Temporal Chunk Streaming:
            </div>
            <div class="d-flex gap-2 small">
              <span class="badge bg-success">Segment 1 ✓</span>
              <span class="badge bg-info text-dark">Segment 2 → generating</span>
              <span class="badge bg-secondary">Segment 3 pending</span>
            </div>
          </div>

          <div *ngIf="isActive(activeJob)" class="text-end mt-2">
            <button
              class="btn btn-sm btn-outline-danger"
              (click)="cancel.emit(activeJob.job_id)"
            >
              <i class="bi bi-x-circle me-1"></i>Cancel Generation
            </button>
          </div>
        </div>

        <!-- Job History Table -->
        <div class="table-responsive" style="max-height: 280px; overflow-y: auto;">
          <table class="table table-dark table-hover mb-0 align-middle small">
            <thead>
              <tr class="text-secondary border-secondary">
                <th>Job ID</th>
                <th>Model</th>
                <th>FPS</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let job of jobs">
                <td class="font-monospace text-info">{{ job.job_id }}</td>
                <td>{{ job.model_id }}</td>
                <td>{{ job.parameters['fps'] || 24 }} fps</td>
                <td>
                  <span [ngClass]="getStatusBadgeClass(job.status)">
                    {{ job.status }}
                  </span>
                </td>
                <td>{{ job.duration_ms ? job.duration_ms + 'ms' : '-' }}</td>
                <td>
                  <button
                    *ngIf="isActive(job)"
                    class="btn btn-sm btn-outline-danger py-0 px-1"
                    (click)="cancel.emit(job.job_id)"
                  >
                    Cancel
                  </button>
                  <span *ngIf="!isActive(job)" class="text-secondary">-</span>
                </td>
              </tr>
              <tr *ngIf="jobs.length === 0">
                <td colspan="6" class="text-center py-4 text-secondary">
                  No video generation jobs recorded yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class VideoJobQueueComponent {
  @Input() jobs: MediaJobDTO[] = [];
  @Input() activeJob: MediaJobDTO | null = null;
  @Output() cancel = new EventEmitter<string>();

  isActive(job: MediaJobDTO): boolean {
    return ['QUEUED', 'ADMITTED', 'LOADING_MODEL', 'GENERATING', 'VALIDATING', 'STORING'].includes(
      job.status
    );
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'COMPLETED':
        return 'badge bg-success';
      case 'GENERATING':
      case 'LOADING_MODEL':
        return 'badge bg-info text-dark';
      case 'QUEUED':
      case 'ADMITTED':
        return 'badge bg-warning text-dark';
      case 'FAILED':
      case 'RESOURCE_DENIED':
        return 'badge bg-danger';
      case 'CANCELLED':
        return 'badge bg-secondary';
      default:
        return 'badge bg-dark border border-secondary';
    }
  }
}
