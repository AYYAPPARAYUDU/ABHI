import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoArtifactDTO } from '../../models/media.model';
import { getApiUrl } from '../../../../core/config/api-config';

@Component({
  selector: 'app-video-artifact-gallery',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-artifact-gallery.component.html',
  styleUrl: './video-artifact-gallery.component.css',
})
export class VideoArtifactGalleryComponent {
  @Input() artifacts: VideoArtifactDTO[] = [];
  @Output() delete = new EventEmitter<string>();

  selectedArtifact: VideoArtifactDTO | null = null;

  getThumbnailUrl(artifactId: string): string {
    return getApiUrl(`/api/v1/media/video/artifacts/${artifactId}/thumbnail`);
  }

  getVideoUrl(artifactId: string): string {
    return getApiUrl(`/api/v1/media/video/artifacts/${artifactId}/file`);
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
