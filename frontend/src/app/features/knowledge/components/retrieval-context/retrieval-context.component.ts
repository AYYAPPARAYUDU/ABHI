import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KnowledgeService } from '../../services/knowledge.service';

@Component({
  selector: 'app-retrieval-context',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './retrieval-context.component.html',
  styleUrl: './retrieval-context.component.css'
})
export class RetrievalContextComponent {
  readonly knowledgeService = inject(KnowledgeService);
}
