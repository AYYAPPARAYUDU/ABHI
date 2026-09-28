import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KnowledgeService } from '../../services/knowledge.service';

@Component({
  selector: 'app-knowledge-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './knowledge-detail.component.html',
  styleUrl: './knowledge-detail.component.css'
})
export class KnowledgeDetailComponent {
  readonly knowledgeService = inject(KnowledgeService);

  get chunk() {
    return this.knowledgeService.selectedChunk();
  }

  getScore(chunk: any): string {
    if (chunk && 'score' in chunk) {
      return `${(chunk.score * 100).toFixed(1)}%`;
    }
    return 'Indexed';
  }

  getCitation(chunk: any): string {
    if (chunk && 'citation' in chunk) {
      return chunk.citation;
    }
    return `[${chunk?.source} (${chunk?.chunk_id})]`;
  }
}
