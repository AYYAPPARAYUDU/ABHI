import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaJobDTO, MediaJobStatus } from '../../models/media.model';

@Component({
  selector: 'app-video-job-queue',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-job-queue.component.html',
  styleUrl: './video-job-queue.component.css',
})
export class VideoJobQueueComponent {
  @Input() jobs: MediaJobDTO[] = [];
  @Input() activeJob: MediaJobDTO | null = null;
  @Output() cancel = new EventEmitter<string>();

  getStatusBadgeClass(status: MediaJobStatus | string): string {
    switch (status) {
      case 'GENERATING':
        return 'badge-generating bg-info text-dark';
      case 'COMPLETED':
        return 'badge-completed bg-success';
      case 'FAILED':
      case 'RESOURCE_DENIED':
        return 'badge-failed bg-danger';
      case 'CANCELLED':
        return 'badge-queued bg-secondary';
      default:
        return 'badge-queued bg-dark';
    }
  }

  isActive(job: MediaJobDTO): boolean {
    return (
      job.status === 'GENERATING' ||
      job.status === 'QUEUED' ||
      job.status === 'ADMITTED' ||
      job.status === 'LOADING_MODEL'
    );
  }
}
