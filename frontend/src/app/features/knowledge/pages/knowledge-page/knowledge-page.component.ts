import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KnowledgeSearchComponent } from '../../components/knowledge-search/knowledge-search.component';
import { SearchResultsComponent } from '../../components/search-results/search-results.component';
import { SourceCardComponent } from '../../components/source-card/source-card.component';
import { RetrievalContextComponent } from '../../components/retrieval-context/retrieval-context.component';
import { KnowledgeDetailComponent } from '../../components/knowledge-detail/knowledge-detail.component';
import { KnowledgeService } from '../../services/knowledge.service';
import { PanelComponent } from '../../../../shared/components/panel/panel.component';

@Component({
  selector: 'app-knowledge-page',
  standalone: true,
  imports: [
    CommonModule,
    KnowledgeSearchComponent,
    SearchResultsComponent,
    SourceCardComponent,
    RetrievalContextComponent,
    KnowledgeDetailComponent,
    PanelComponent
  ],
  templateUrl: './knowledge-page.component.html',
  styleUrl: './knowledge-page.component.css'
})
export class KnowledgePageComponent {
  readonly knowledgeService = inject(KnowledgeService);
}
