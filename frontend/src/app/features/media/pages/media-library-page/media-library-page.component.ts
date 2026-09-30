import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MediaService } from '../../services/media.service';
import {
  MediaSearchResultDTO,
  MediaUnderstandingRecordDTO,
  MediaSearchMode,
  MediaCollectionDTO,
  MediaReuseRecommendationDTO,
  VideoSceneRecordDTO,
  AudioSegmentRecordDTO,
  OCRBlockDTO,
} from '../../models/media.model';

@Component({
  selector: 'app-media-library-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      <!-- Header Banner -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-2xl">
        <div>
          <div class="flex items-center gap-3">
            <span class="text-3xl p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">🔍</span>
            <div>
              <h1 class="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Multimodal Media Library & Semantic Search
              </h1>
              <p class="text-sm text-slate-400 mt-0.5">
                Local-first semantic discovery, OCR/transcript extraction, scene indexing & GPU-saving asset reuse engine
              </p>
            </div>
          </div>
        </div>

        <!-- Mode & Stats Counter -->
        <div class="flex items-center gap-3">
          <div class="bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-2 text-center">
            <div class="text-xs text-slate-400 font-medium">Search Mode</div>
            <div class="text-sm font-semibold text-cyan-400">{{ selectedMode() }}</div>
          </div>
          <div class="bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-2 text-center">
            <div class="text-xs text-slate-400 font-medium">Assets Found</div>
            <div class="text-sm font-semibold text-indigo-300">{{ searchResults().length }}</div>
          </div>
          <button
            (click)="refreshSearch()"
            class="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            <span>🔄</span> Refresh
          </button>
        </div>
      </div>

      <!-- Search & Filters Control Bar -->
      <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 backdrop-blur-md">
        <!-- Main Search Row -->
        <div class="flex flex-col md:flex-row gap-3">
          <div class="relative flex-1">
            <span class="absolute left-4 top-3.5 text-slate-400 text-base">🔎</span>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onQueryChange()"
              placeholder="Search concepts, scenes, speech, tags, OCR text (e.g. 'cyberpunk city night', 'Telugu explanation', 'neon signs')..."
              class="w-full bg-slate-950/80 border border-slate-700/70 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          <!-- Search Mode Selector -->
          <div class="flex bg-slate-950/80 p-1 border border-slate-800 rounded-xl">
            <button
              *ngFor="let m of searchModes"
              (click)="setSearchMode(m)"
              [class.bg-indigo-600]="selectedMode() === m"
              [class.text-white]="selectedMode() === m"
              [class.text-slate-400]="selectedMode() !== m"
              class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
            >
              {{ m }}
            </button>
          </div>
        </div>

        <!-- Filter Chips Row -->
        <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60 text-xs">
          <!-- Modality Filter -->
          <div class="flex items-center gap-2">
            <span class="text-slate-400 font-medium">Type:</span>
            <button
              *ngFor="let type of mediaTypes"
              (click)="toggleMediaType(type)"
              [class.bg-cyan-500]="selectedType() === type"
              [class.text-slate-950]="selectedType() === type"
              [class.font-bold]="selectedType() === type"
              [class.bg-slate-800]="selectedType() !== type"
              [class.text-slate-300]="selectedType() !== type"
              class="px-2.5 py-1 rounded-lg transition-all"
            >
              {{ type }}
            </button>
          </div>

          <!-- Language Filter -->
          <div class="flex items-center gap-2">
            <span class="text-slate-400 font-medium">Language:</span>
            <button
              *ngFor="let lang of languages"
              (click)="toggleLanguage(lang.code)"
              [class.bg-emerald-500]="selectedLang() === lang.code"
              [class.text-slate-950]="selectedLang() === lang.code"
              [class.font-bold]="selectedLang() === lang.code"
              [class.bg-slate-800]="selectedLang() !== lang.code"
              [class.text-slate-300]="selectedLang() !== lang.code"
              class="px-2.5 py-1 rounded-lg transition-all"
            >
              {{ lang.label }}
            </button>
          </div>

          <!-- Active Collections Trigger -->
          <div class="flex items-center gap-2">
            <button
              (click)="showCollectionsModal.set(true)"
              class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 rounded-lg transition-all flex items-center gap-1.5"
            >
              <span>📁</span> Collections ({{ collections().length }})
            </button>
            <button
              (click)="showReuseModal.set(true)"
              class="px-3 py-1 bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-500/30 rounded-lg transition-all flex items-center gap-1.5"
            >
              <span>♻️</span> Reuse Evaluator
            </button>
          </div>
        </div>
      </div>

      <!-- Main Layout: Assets Grid + Inspector Drawer -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Media Assets Grid (Left 8 Cols or 12 if no selection) -->
        <div [class]="selectedArtifact() ? 'lg:col-span-7' : 'lg:col-span-12'" class="space-y-4">
          <!-- Loading & Empty States -->
          <div *ngIf="isLoading()" class="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
            <div class="inline-block animate-spin text-3xl mb-2">🌀</div>
            <p class="text-sm text-slate-400">Searching and evaluating semantic vectors...</p>
          </div>

          <div *ngIf="!isLoading() && searchResults().length === 0" class="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
            <div class="text-4xl mb-3">📂</div>
            <h3 class="text-lg font-semibold text-white">No media assets match your query</h3>
            <p class="text-sm text-slate-400 mt-1">Try broadening your search query or selecting 'ALL' media types.</p>
          </div>

          <!-- Cards Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div
              *ngFor="let item of searchResults()"
              (click)="selectArtifact(item)"
              [class.ring-2]="selectedArtifact()?.artifact_id === item.artifact_id"
              [class.ring-indigo-500]="selectedArtifact()?.artifact_id === item.artifact_id"
              class="bg-slate-900/80 hover:bg-slate-850 border border-slate-800 rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 shadow-md hover:shadow-xl hover:border-slate-700 active:scale-[0.99]"
            >
              <!-- Card Top: Media Type & Score -->
              <div class="flex items-center justify-between">
                <span
                  [ngClass]="{
                    'bg-cyan-500/10 text-cyan-400 border-cyan-500/20': item.media_type === 'IMAGE',
                    'bg-purple-500/10 text-purple-400 border-purple-500/20': item.media_type === 'VIDEO',
                    'bg-amber-500/10 text-amber-400 border-amber-500/20': item.media_type === 'AUDIO',
                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20': item.media_type === 'SUBTITLE'
                  }"
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border uppercase flex items-center gap-1"
                >
                  <span *ngIf="item.media_type === 'IMAGE'">🖼️</span>
                  <span *ngIf="item.media_type === 'VIDEO'">🎬</span>
                  <span *ngIf="item.media_type === 'AUDIO'">🎙️</span>
                  <span *ngIf="item.media_type === 'SUBTITLE'">📝</span>
                  {{ item.media_type }}
                </span>

                <div class="flex items-center gap-1.5">
                  <span class="text-[11px] font-semibold text-slate-400">Score:</span>
                  <span class="text-xs font-mono font-bold text-indigo-400">{{ (item.score * 100).toFixed(1) }}%</span>
                </div>
              </div>

              <!-- Media Preview Box -->
              <div class="h-32 bg-slate-950/80 rounded-xl border border-slate-800/80 flex flex-col items-center justify-center p-3 text-center overflow-hidden relative">
                <div class="text-2xl mb-1 opacity-70">
                  <span *ngIf="item.media_type === 'IMAGE'">🖼️</span>
                  <span *ngIf="item.media_type === 'VIDEO'">🎥</span>
                  <span *ngIf="item.media_type === 'AUDIO'">🎧</span>
                  <span *ngIf="item.media_type === 'SUBTITLE'">📄</span>
                </div>
                <div class="text-xs text-slate-300 font-medium line-clamp-2">{{ item.caption || item.filename }}</div>
                <div *ngIf="item.duration" class="text-[10px] text-slate-500 mt-1 font-mono">⏱️ {{ item.duration.toFixed(1) }}s</div>
              </div>

              <!-- Card Bottom: Technical & Provenance Badges -->
              <div class="space-y-2 pt-1 border-t border-slate-800/60 text-[11px]">
                <div class="flex items-center justify-between text-slate-400">
                  <span class="font-mono text-[10px] truncate max-w-[120px]">{{ item.artifact_id }}</span>
                  <span *ngIf="item.resolution" class="font-mono text-[10px]">{{ item.resolution[0] }}x{{ item.resolution[1] }}</span>
                  <span class="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] uppercase font-bold">{{ item.language }}</span>
                </div>

                <!-- Match Reason -->
                <div class="text-[10px] text-indigo-300/80 truncate">
                  💡 {{ item.match_reason }}
                </div>

                <!-- Tags -->
                <div *ngIf="item.tags && item.tags.length > 0" class="flex flex-wrap gap-1">
                  <span *ngFor="let t of item.tags.slice(0, 3)" class="px-1.5 py-0.2 bg-slate-800/80 text-slate-300 rounded text-[9px]">
                    #{{ t }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Inspector Drawer (Right 5 Cols) -->
        <div *ngIf="selectedArtifact()" class="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5 backdrop-blur-md sticky top-6 max-h-[85vh] overflow-y-auto">
          <!-- Inspector Header -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 class="text-base font-bold text-white flex items-center gap-2">
                <span>🔬</span> Media Understanding Inspector
              </h3>
              <p class="text-xs font-mono text-slate-400">{{ selectedArtifact()?.artifact_id }}</p>
            </div>
            <button
              (click)="selectedArtifact.set(null)"
              class="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all"
            >
              ✕
            </button>
          </div>

          <!-- Quick Action Buttons -->
          <div class="grid grid-cols-2 gap-2">
            <button
              (click)="findSimilar()"
              class="px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
            >
              <span>✨</span> Find Similar Media
            </button>
            <button
              (click)="triggerReanalysis()"
              class="px-3 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
            >
              <span>🔍</span> Force Re-analyze
            </button>
          </div>

          <!-- Technical Metadata Card -->
          <div class="bg-slate-950/80 rounded-xl p-4 border border-slate-800/80 space-y-3">
            <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>⚙️</span> Technical Media Specifications
            </h4>
            <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <span class="text-slate-500">Format/Codec:</span>
                <span class="font-mono text-slate-200 ml-1 font-semibold">{{ selectedArtifact()?.technical_metadata?.['codec'] || selectedArtifact()?.media_type }}</span>
              </div>
              <div>
                <span class="text-slate-500">Duration:</span>
                <span class="font-mono text-slate-200 ml-1">{{ selectedArtifact()?.duration ? selectedArtifact()?.duration?.toFixed(2) + 's' : 'N/A' }}</span>
              </div>
              <div>
                <span class="text-slate-500">Resolution:</span>
                <span class="font-mono text-slate-200 ml-1">{{ selectedArtifact()?.resolution ? selectedArtifact()?.resolution![0] + 'x' + selectedArtifact()?.resolution![1] : 'N/A' }}</span>
              </div>
              <div>
                <span class="text-slate-500">SHA-256:</span>
                <span class="font-mono text-slate-200 ml-1 text-[10px]">{{ selectedArtifact()?.technical_metadata?.['sha256']?.substring(0, 10) || 'N/A' }}...</span>
              </div>
            </div>
          </div>

          <!-- Semantic Understanding Details -->
          <div class="bg-slate-950/80 rounded-xl p-4 border border-slate-800/80 space-y-3">
            <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>🧠</span> Semantic Understanding & Representation
            </h4>
            
            <div class="space-y-2 text-xs">
              <div>
                <span class="text-slate-500 block mb-0.5 font-medium">Caption:</span>
                <p class="text-slate-200 bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-[11px] leading-relaxed">
                  {{ activeUnderstanding()?.caption || selectedArtifact()?.caption || 'No caption extracted.' }}
                </p>
              </div>

              <div *ngIf="activeUnderstanding()?.visual_style" class="flex items-center gap-2">
                <span class="text-slate-500 font-medium">Style:</span>
                <span class="text-indigo-300 font-semibold">{{ activeUnderstanding()?.visual_style }}</span>
              </div>

              <div *ngIf="activeUnderstanding()?.environment" class="flex items-center gap-2">
                <span class="text-slate-500 font-medium">Environment:</span>
                <span class="text-cyan-300 font-semibold">{{ activeUnderstanding()?.environment }}</span>
              </div>

              <!-- Tags -->
              <div>
                <span class="text-slate-500 block mb-1 font-medium">Visual Tags:</span>
                <div class="flex flex-wrap gap-1">
                  <span *ngFor="let tag of activeUnderstanding()?.visual_tags || selectedArtifact()?.tags" class="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800/60 rounded text-[10px]">
                    #{{ tag }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- OCR Section (if text detected) -->
          <div *ngIf="activeUnderstanding()?.ocr_text_full || (activeUnderstanding()?.ocr_blocks && activeUnderstanding()!.ocr_blocks.length > 0)" class="bg-slate-950/80 rounded-xl p-4 border border-slate-800/80 space-y-2">
            <h4 class="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>📝</span> Optical Character Recognition (OCR)
            </h4>
            <div class="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-xs font-mono text-amber-200/90 leading-relaxed max-h-28 overflow-y-auto">
              {{ activeUnderstanding()?.ocr_text_full }}
            </div>
          </div>

          <!-- Video Scenes Section (if Video) -->
          <div *ngIf="activeUnderstanding()?.scenes && activeUnderstanding()!.scenes.length > 0" class="bg-slate-950/80 rounded-xl p-4 border border-slate-800/80 space-y-2">
            <h4 class="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>🎬</span> Video Scene Timeline ({{ activeUnderstanding()!.scenes.length }})
            </h4>
            <div class="space-y-2 max-h-40 overflow-y-auto pr-1">
              <div *ngFor="let scn of activeUnderstanding()!.scenes" class="p-2 bg-slate-900 rounded-lg border border-slate-800 text-[11px] space-y-1">
                <div class="flex items-center justify-between font-mono text-[10px] text-purple-300">
                  <span>Scene #{{ scn.scene_index + 1 }} ({{ scn.scene_id }})</span>
                  <span>{{ scn.start_time.toFixed(1) }}s - {{ scn.end_time.toFixed(1) }}s</span>
                </div>
                <div class="text-slate-300">{{ scn.caption }}</div>
              </div>
            </div>
          </div>

          <!-- Audio Segments Section (if Audio) -->
          <div *ngIf="activeUnderstanding()?.audio_transcript_full" class="bg-slate-950/80 rounded-xl p-4 border border-slate-800/80 space-y-2">
            <h4 class="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>🎙️</span> Audio Transcript (STT)
            </h4>
            <p class="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-xs text-emerald-200/90 leading-relaxed max-h-28 overflow-y-auto">
              {{ activeUnderstanding()?.audio_transcript_full }}
            </p>
          </div>
        </div>
      </div>

      <!-- Collections Modal -->
      <div *ngIf="showCollectionsModal()" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
          <div class="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 class="text-lg font-bold text-white flex items-center gap-2">
              <span>📁</span> Media Collections
            </h3>
            <button (click)="showCollectionsModal.set(false)" class="text-slate-400 hover:text-white">✕</button>
          </div>

          <div class="space-y-3 max-h-60 overflow-y-auto">
            <div *ngFor="let col of collections()" class="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <div class="text-sm font-semibold text-white">{{ col.title }}</div>
                <div class="text-xs text-slate-400">{{ col.description || 'No description' }} · {{ col.artifact_ids.length }} assets</div>
              </div>
              <span class="px-2 py-0.5 bg-indigo-950 text-indigo-300 rounded text-[10px] font-bold uppercase">{{ col.collection_type }}</span>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button (click)="showCollectionsModal.set(false)" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium">Close</button>
          </div>
        </div>
      </div>

      <!-- Reuse Evaluator Modal -->
      <div *ngIf="showReuseModal()" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
          <div class="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 class="text-lg font-bold text-white flex items-center gap-2">
              <span>♻️</span> Media Reuse & GPU Conservation Evaluator
            </h3>
            <button (click)="showReuseModal.set(false)" class="text-slate-400 hover:text-white">✕</button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="text-xs text-slate-400 block mb-1">Target Role / Concept:</label>
              <input
                type="text"
                [(ngModel)]="reuseConcept"
                placeholder="e.g. SCENE_BACKGROUND: Futuristic cyberpunk neon city"
                class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              (click)="evaluateReuse()"
              class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all"
            >
              Evaluate Local Candidates
            </button>
          </div>

          <!-- Recommendations List -->
          <div *ngIf="reuseRecommendations().length > 0" class="space-y-2 max-h-60 overflow-y-auto pt-2 border-t border-slate-800">
            <div *ngFor="let rec of reuseRecommendations()" class="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs">
              <div class="flex items-center justify-between">
                <span class="font-mono text-emerald-400 font-bold">{{ rec.candidate_artifact_id }}</span>
                <span class="px-2 py-0.5 bg-emerald-950 text-emerald-300 rounded text-[10px] font-bold">{{ rec.compatibility_status }}</span>
              </div>
              <div class="text-slate-300 text-[11px]">Match Score: {{ (rec.match_score * 100).toFixed(1) }}% · Saved: {{ rec.estimated_gpu_time_saved_s }}s GPU</div>
              <ul class="text-[10px] text-slate-400 list-disc list-inside">
                <li *ngFor="let n of rec.compatibility_notes">{{ n }}</li>
              </ul>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-800 flex items-center justify-end">
            <button (click)="showReuseModal.set(false)" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium">Close</button>
          </div>
        </div>
      </div>
    </div>
  `,
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
