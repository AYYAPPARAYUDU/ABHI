import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KnowledgeService } from '../../services/knowledge.service';
import { KnowledgeSearchResult } from '../../models/knowledge.model';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './search-results.component.html',
  styleUrl: './search-results.component.css'
})
export class SearchResultsComponent {
  readonly knowledgeService = inject(KnowledgeService);

  onSelect(result: KnowledgeSearchResult): void {
    this.knowledgeService.selectChunk(result);
  }
}
