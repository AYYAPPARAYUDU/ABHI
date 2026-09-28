import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KnowledgeService } from '../../services/knowledge.service';

@Component({
  selector: 'app-source-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './source-card.component.html',
  styleUrl: './source-card.component.css'
})
export class SourceCardComponent {
  readonly knowledgeService = inject(KnowledgeService);

  get sourcesInfo() {
    return this.knowledgeService.sourcesInfo();
  }
}
