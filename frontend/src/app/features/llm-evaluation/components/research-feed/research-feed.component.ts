import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvaluationService } from '../../services/evaluation.service';
import { ResearchPaper } from '../../models/evaluation.model';

@Component({
  selector: 'app-research-feed',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './research-feed.component.html',
  styleUrls: ['./research-feed.component.css']
})
export class ResearchFeedComponent {
  readonly evalService = inject(EvaluationService);

  onIngest(paper: ResearchPaper): void {
    this.evalService.ingestPaper(paper.source_id);
  }

  onQuarantine(paper: ResearchPaper): void {
    this.evalService.quarantinePaper(paper.source_id, 'Manual operator review requested');
  }
}
