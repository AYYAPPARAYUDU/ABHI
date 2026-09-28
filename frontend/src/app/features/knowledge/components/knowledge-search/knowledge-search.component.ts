import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KnowledgeService } from '../../services/knowledge.service';

@Component({
  selector: 'app-knowledge-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './knowledge-search.component.html',
  styleUrl: './knowledge-search.component.css'
})
export class KnowledgeSearchComponent {
  readonly knowledgeService = inject(KnowledgeService);
  searchQuery: string = '';

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.knowledgeService.executeSearch(this.searchQuery);
    }
  }

  onClear(): void {
    this.searchQuery = '';
    this.knowledgeService.clearSearch();
  }
}
