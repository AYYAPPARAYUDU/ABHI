import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoArtifactDTO } from '../../models/media.model';

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

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
