import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MediaService } from '../../services/media.service';
import {
  MediaSearchResultDTO,
  MediaSearchMode,
} from '../../models/media.model';

@Component({
  selector: 'app-media-library-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './media-library-page.component.html',
  styleUrl: './media-library-page.component.css'
})
export class MediaLibraryPageComponent implements OnInit {
  private mediaService = inject(MediaService);

  // Component State
  searchQuery = '';
  selectedMode = signal<MediaSearchMode>('HYBRID');
  selectedType = signal<string>('ALL');
  selectedLang = signal<string>('ALL');
  selectedArtifact = signal<MediaSearchResultDTO | null>(null);

  showCollectionsModal = signal<boolean>(false);
  showReuseModal = signal<boolean>(false);
  reuseConcept = 'Futuristic city street at night';

  searchModes: MediaSearchMode[] = ['HYBRID', 'SEMANTIC', 'TEXT', 'FILTERED', 'SIMILARITY'];
  mediaTypes: string[] = ['ALL', 'IMAGE', 'VIDEO', 'AUDIO', 'SUBTITLE'];
  languages = [
    { code: 'ALL', label: 'All Languages' },
    { code: 'en', label: 'English' },
    { code: 'te', label: 'Telugu (తెలుగు)' },
    { code: 'hi', label: 'Hindi (हिन्दी)' },
    { code: 'ta', label: 'Tamil (தமிழ்)' },
  ];

  // Media Service Signals
  searchResults = this.mediaService.librarySearchResults;
  activeUnderstanding = this.mediaService.activeUnderstanding;
  collections = this.mediaService.collections;
  reuseRecommendations = this.mediaService.reuseRecommendations;
  isLoading = this.mediaService.isLibraryLoading;

  ngOnInit(): void {
    this.refreshSearch();
    this.mediaService.fetchCollections().subscribe();
  }

  setSearchMode(mode: MediaSearchMode): void {
    this.selectedMode.set(mode);
    this.refreshSearch();
  }

  toggleMediaType(type: string): void {
    this.selectedType.set(type);
    this.refreshSearch();
  }

  toggleLanguage(lang: string): void {
    this.selectedLang.set(lang);
    this.refreshSearch();
  }

  onQueryChange(): void {
    this.refreshSearch();
  }

  refreshSearch(): void {
    const types = this.selectedType() === 'ALL' ? undefined : [this.selectedType()];
    const langs = this.selectedLang() === 'ALL' ? undefined : [this.selectedLang()];

    this.mediaService
      .searchLibrary({
        query: this.searchQuery.trim() || undefined,
        media_types: types,
        languages: langs,
        search_mode: this.selectedMode(),
        limit: 50,
      })
      .subscribe();
  }

  selectArtifact(item: MediaSearchResultDTO): void {
    this.selectedArtifact.set(item);
    this.mediaService.getMediaUnderstanding(item.artifact_id).subscribe();
  }

  findSimilar(): void {
    const art = this.selectedArtifact();
    if (!art) return;
    this.selectedMode.set('SIMILARITY');
    this.searchQuery = art.caption || art.filename;
    this.refreshSearch();
  }

  triggerReanalysis(): void {
    const art = this.selectedArtifact();
    if (!art) return;
    this.mediaService.triggerAnalysis(art.artifact_id, { force_reanalysis: true }).subscribe();
  }

  evaluateReuse(): void {
    this.mediaService
      .evaluateReuseCandidate({
        target_role: 'CREATIVE_PIPELINE_ASSET',
        desired_media_type: this.selectedType() === 'ALL' ? 'IMAGE' : this.selectedType(),
        desired_concept: this.reuseConcept,
      })
      .subscribe();
  }
}
