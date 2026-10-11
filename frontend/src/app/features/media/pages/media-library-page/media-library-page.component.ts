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
    <div class="abhi-media-library-workspace" role="region" aria-label="Media Library & Search">
      <!-- Header Banner -->
      <header class="library-header-card">
        <div class="library-title-group">
          <div class="library-title-row">
            <span class="library-icon">🔍</span>
            <div>
              <h1 class="library-title">
                Multimodal Media Library & Semantic Search
              </h1>
              <p class="library-subtitle">
                Local-first semantic discovery, OCR/transcript extraction, scene indexing & GPU-saving asset reuse engine
              </p>
            </div>
          </div>
        </div>

        <!-- Mode & Stats Counter -->
        <div class="library-stats-row">
          <div class="library-metric-well">
            <span class="metric-label">SEARCH MODE</span>
            <span class="metric-value cyan-val">{{ selectedMode() }}</span>
          </div>
          <div class="library-metric-well">
            <span class="metric-label">ASSETS FOUND</span>
            <span class="metric-value blue-val">{{ searchResults().length }}</span>
          </div>
          <button
            type="button"
            (click)="refreshSearch()"
            class="library-action-btn"
            title="Refresh Search"
          >
            <span>🔄</span> Refresh
          </button>
        </div>
      </header>

      <!-- Search & Filters Control Bar -->
      <section class="library-search-card">
        <!-- Main Search Row -->
        <div class="search-input-row">
          <div class="search-input-wrapper">
            <span class="search-icon">🔎</span>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onQueryChange()"
              placeholder="Search concepts, scenes, speech, tags, OCR text (e.g. 'cyberpunk city night', 'Telugu explanation', 'neon signs')..."
              class="library-search-field"
            />
          </div>

          <!-- Search Mode Selector -->
          <div class="modes-pill-group">
            @for (m of searchModes; track m) {
              <button
                type="button"
                (click)="setSearchMode(m)"
                [class.active]="selectedMode() === m"
                class="mode-chip"
              >
                {{ m }}
              </button>
            }
          </div>
        </div>

        <!-- Filter Chips Row -->
        <div class="filters-row">
          <!-- Modality Filter -->
          <div class="filter-group">
            <span class="filter-label">Type:</span>
            @for (type of mediaTypes; track type) {
              <button
                type="button"
                (click)="toggleMediaType(type)"
                [class.active]="selectedType() === type"
                class="filter-chip"
              >
                {{ type }}
              </button>
            }
          </div>

          <!-- Language Filter -->
          <div class="filter-group">
            <span class="filter-label">Language:</span>
            @for (lang of languages; track lang.code) {
              <button
                type="button"
                (click)="toggleLanguage(lang.code)"
                [class.active]="selectedLang() === lang.code"
                class="filter-chip"
              >
                {{ lang.label }}
              </button>
            }
          </div>

          <!-- Active Collections Trigger -->
          <div class="modal-triggers-group">
            <button
              type="button"
              (click)="showCollectionsModal.set(true)"
              class="collections-btn"
            >
              <span>📁</span> Collections ({{ collections().length }})
            </button>
            <button
              type="button"
              (click)="showReuseModal.set(true)"
              class="reuse-btn"
            >
              <span>♻️</span> Reuse Evaluator
            </button>
          </div>
        </div>
      </section>

      <!-- Main Layout: Assets Grid + Inspector Drawer -->
      <div class="library-main-grid" [class.has-drawer]="selectedArtifact()">
        <!-- Media Assets Grid -->
        <div class="assets-pane">
          <!-- Loading & Empty States -->
          @if (isLoading()) {
            <div class="empty-state-card">
              <div class="spin-icon">🌀</div>
              <p>Searching and evaluating semantic vectors...</p>
            </div>
          }

          @if (!isLoading() && searchResults().length === 0) {
            <div class="empty-state-card">
              <div class="empty-icon">📂</div>
              <h3>No media assets match your query</h3>
              <p>Try broadening your search query or selecting 'ALL' media types.</p>
            </div>
          }

          <!-- Cards Grid -->
          <div class="cards-grid">
            @for (item of searchResults(); track item.artifact_id) {
              <div
                (click)="selectArtifact(item)"
                [class.selected]="selectedArtifact()?.artifact_id === item.artifact_id"
                class="artifact-card"
              >
                <!-- Card Top: Media Type & Score -->
                <div class="card-header-row">
                  <span
                    class="type-pill"
                    [attr.data-type]="item.media_type"
                  >
                    @if (item.media_type === 'IMAGE') { <span>🖼️</span> }
                    @if (item.media_type === 'VIDEO') { <span>🎬</span> }
                    @if (item.media_type === 'AUDIO') { <span>🎙️</span> }
                    @if (item.media_type === 'SUBTITLE') { <span>📝</span> }
                    {{ item.media_type }}
                  </span>

                  <div class="score-pill">
                    <span class="score-label">Score:</span>
                    <span class="score-val">{{ (item.score * 100).toFixed(1) }}%</span>
                  </div>
                </div>

                <!-- Media Preview Box -->
                <div class="media-preview-box">
                  <div class="preview-icon">
                    @if (item.media_type === 'IMAGE') { <span>🖼️</span> }
                    @if (item.media_type === 'VIDEO') { <span>🎥</span> }
                    @if (item.media_type === 'AUDIO') { <span>🎧</span> }
                    @if (item.media_type === 'SUBTITLE') { <span>📄</span> }
                  </div>
                  <div class="preview-caption">{{ item.caption || item.filename }}</div>
                  @if (item.duration) {
                    <div class="duration-badge">⏱️ {{ item.duration.toFixed(1) }}s</div>
                  }
                </div>

                <!-- Card Bottom: Technical & Provenance Badges -->
                <div class="card-footer-info">
                  <div class="meta-row">
                    <span class="artifact-id-text">{{ item.artifact_id }}</span>
                    @if (item.resolution) {
                      <span class="res-text">{{ item.resolution[0] }}x{{ item.resolution[1] }}</span>
                    }
                    <span class="lang-text">{{ item.language }}</span>
                  </div>

                  <!-- Match Reason -->
                  <div class="match-reason-text">
                    💡 {{ item.match_reason }}
                  </div>

                  <!-- Tags -->
                  @if (item.tags && item.tags.length > 0) {
                    <div class="tags-wrap">
                      @for (t of item.tags.slice(0, 3); track t) {
                        <span class="item-tag">#{{ t }}</span>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Inspector Drawer (Right Side) -->
        @if (selectedArtifact()) {
          <aside class="inspector-drawer">
            <!-- Inspector Header -->
            <div class="inspector-top-row">
              <div>
                <h3 class="inspector-title">
                  <span>🔬</span> Media Understanding Inspector
                </h3>
                <p class="inspector-sub">{{ selectedArtifact()?.artifact_id }}</p>
              </div>
              <button
                type="button"
                (click)="selectedArtifact.set(null)"
                class="inspector-close-btn"
              >
                ✕
              </button>
            </div>

            <!-- Quick Action Buttons -->
            <div class="inspector-actions-grid">
              <button
                type="button"
                (click)="findSimilar()"
                class="action-pill find-similar-btn"
              >
                <span>✨</span> Find Similar Media
              </button>
              <button
                type="button"
                (click)="triggerReanalysis()"
                class="action-pill reanalyze-btn"
              >
                <span>🔍</span> Force Re-analyze
              </button>
            </div>

            <!-- Technical Metadata Card -->
            <div class="inspector-section-card">
              <h4 class="section-title">
                <span>⚙️</span> Technical Media Specifications
              </h4>
              <div class="specs-grid">
                <div>
                  <span class="spec-label">Format/Codec:</span>
                  <span class="spec-val">{{ selectedArtifact()?.technical_metadata?.['codec'] || selectedArtifact()?.media_type }}</span>
                </div>
                <div>
                  <span class="spec-label">Duration:</span>
                  <span class="spec-val">{{ selectedArtifact()?.duration ? selectedArtifact()?.duration?.toFixed(2) + 's' : 'N/A' }}</span>
                </div>
                <div>
                  <span class="spec-label">Resolution:</span>
                  <span class="spec-val">{{ selectedArtifact()?.resolution ? selectedArtifact()?.resolution![0] + 'x' + selectedArtifact()?.resolution![1] : 'N/A' }}</span>
                </div>
                <div>
                  <span class="spec-label">SHA-256:</span>
                  <span class="spec-val">{{ selectedArtifact()?.technical_metadata?.['sha256']?.substring(0, 10) || 'N/A' }}...</span>
                </div>
              </div>
            </div>

            <!-- Semantic Understanding Details -->
            <div class="inspector-section-card">
              <h4 class="section-title">
                <span>🧠</span> Semantic Understanding & Representation
              </h4>
              
              <div class="semantic-content-block">
                <div>
                  <span class="spec-label">Caption:</span>
                  <p class="caption-well">
                    {{ activeUnderstanding()?.caption || selectedArtifact()?.caption || 'No caption extracted.' }}
                  </p>
                </div>

                @if (activeUnderstanding()?.visual_style) {
                  <div class="spec-inline-row">
                    <span class="spec-label">Style:</span>
                    <span class="spec-accent-val">{{ activeUnderstanding()?.visual_style }}</span>
                  </div>
                }

                @if (activeUnderstanding()?.environment) {
                  <div class="spec-inline-row">
                    <span class="spec-label">Environment:</span>
                    <span class="spec-accent-val">{{ activeUnderstanding()?.environment }}</span>
                  </div>
                }

                <!-- Tags -->
                <div>
                  <span class="spec-label">Visual Tags:</span>
                  <div class="tags-wrap">
                    @for (tag of activeUnderstanding()?.visual_tags || selectedArtifact()?.tags; track tag) {
                      <span class="tag-chip">#{{ tag }}</span>
                    }
                  </div>
                </div>
              </div>
            </div>

            <!-- OCR Section (if text detected) -->
            @if (activeUnderstanding()?.ocr_text_full || (activeUnderstanding()?.ocr_blocks && activeUnderstanding()!.ocr_blocks.length > 0)) {
              <div class="inspector-section-card">
                <h4 class="section-title amber-title">
                  <span>📝</span> Optical Character Recognition (OCR)
                </h4>
                <div class="ocr-well">
                  {{ activeUnderstanding()?.ocr_text_full }}
                </div>
              </div>
            }

            <!-- Video Scenes Section (if Video) -->
            @if (activeUnderstanding()?.scenes && activeUnderstanding()!.scenes.length > 0) {
              <div class="inspector-section-card">
                <h4 class="section-title violet-title">
                  <span>🎬</span> Video Scene Timeline ({{ activeUnderstanding()!.scenes.length }})
                </h4>
                <div class="scenes-list">
                  @for (scn of activeUnderstanding()!.scenes; track scn.scene_id) {
                    <div class="scene-item">
                      <div class="scene-item-top">
                        <span>Scene #{{ scn.scene_index + 1 }} ({{ scn.scene_id }})</span>
                        <span>{{ scn.start_time.toFixed(1) }}s - {{ scn.end_time.toFixed(1) }}s</span>
                      </div>
                      <div class="scene-caption">{{ scn.caption }}</div>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Audio Segments Section (if Audio) -->
            @if (activeUnderstanding()?.audio_transcript_full) {
              <div class="inspector-section-card">
                <h4 class="section-title emerald-title">
                  <span>🎙️</span> Audio Transcript (STT)
                </h4>
                <p class="ocr-well">
                  {{ activeUnderstanding()?.audio_transcript_full }}
                </p>
              </div>
            }
          </aside>
        }
      </div>

      <!-- Collections Modal -->
      @if (showCollectionsModal()) {
        <div class="modal-backdrop-overlay" (click)="showCollectionsModal.set(false)">
          <div class="modal-panel-shell" (click)="$event.stopPropagation()">
            <div class="modal-head">
              <h3 class="modal-title"><span>📁</span> Media Collections</h3>
              <button type="button" (click)="showCollectionsModal.set(false)" class="modal-close-btn">✕</button>
            </div>

            <div class="modal-body-scroll">
              @for (col of collections(); track col.collection_id) {
                <div class="collection-item-row">
                  <div>
                    <div class="col-title">{{ col.title }}</div>
                    <div class="col-desc">{{ col.description || 'No description' }} · {{ col.artifact_ids.length }} assets</div>
                  </div>
                  <span class="col-type-tag">{{ col.collection_type }}</span>
                </div>
              }
            </div>

            <div class="modal-foot">
              <button type="button" (click)="showCollectionsModal.set(false)" class="modal-btn">Close</button>
            </div>
          </div>
        </div>
      }

      <!-- Reuse Evaluator Modal -->
      @if (showReuseModal()) {
        <div class="modal-backdrop-overlay" (click)="showReuseModal.set(false)">
          <div class="modal-panel-shell wide-modal" (click)="$event.stopPropagation()">
            <div class="modal-head">
              <h3 class="modal-title"><span>♻️</span> Media Reuse & GPU Conservation Evaluator</h3>
              <button type="button" (click)="showReuseModal.set(false)" class="modal-close-btn">✕</button>
            </div>

            <div class="reuse-input-block">
              <label class="reuse-label">Target Role / Concept:</label>
              <input
                type="text"
                [(ngModel)]="reuseConcept"
                placeholder="e.g. SCENE_BACKGROUND: Futuristic cyberpunk neon city"
                class="reuse-field"
              />
              <button
                type="button"
                (click)="evaluateReuse()"
                class="reuse-eval-btn"
              >
                Evaluate Local Candidates
              </button>
            </div>

            <!-- Recommendations List -->
            @if (reuseRecommendations().length > 0) {
              <div class="recommendations-scroll">
                @for (rec of reuseRecommendations(); track rec.candidate_artifact_id) {
                  <div class="rec-card">
                    <div class="rec-card-top">
                      <span class="candidate-id">{{ rec.candidate_artifact_id }}</span>
                      <span class="rec-status">{{ rec.compatibility_status }}</span>
                    </div>
                    <div class="rec-summary">Match Score: {{ (rec.match_score * 100).toFixed(1) }}% · Saved: {{ rec.estimated_gpu_time_saved_s }}s GPU</div>
                    <ul class="rec-notes-list">
                      @for (n of rec.compatibility_notes; track n) {
                        <li>{{ n }}</li>
                      }
                    </ul>
                  </div>
                }
              </div>
            }

            <div class="modal-foot">
              <button type="button" (click)="showReuseModal.set(false)" class="modal-btn">Close</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-height: 100%;
    }

    .abhi-media-library-workspace {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 8px 4px 40px 4px;
    }

    /* Header */
    .library-header-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      padding: 20px 24px;
      background: var(--abhi-surface-raised, #0e1828);
      border: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      border-radius: var(--abhi-radius-control, 18px);
      box-shadow: var(--abhi-raised-shadow, 9px 9px 22px rgba(0, 0, 0, 0.43));
      backdrop-filter: blur(16px);
    }

    .library-title-row {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .library-icon {
      font-size: 26px;
      padding: 8px;
      background: var(--abhi-surface-inset, #080e18);
      border: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .library-title {
      font-size: 20px;
      font-weight: 800;
      color: var(--abhi-text-primary, #eef5ff);
      margin: 0;
    }

    .library-subtitle {
      font-size: 12px;
      color: var(--abhi-text-muted, #8193ac);
      margin: 4px 0 0 0;
    }

    .library-stats-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .library-metric-well {
      display: flex;
      flex-direction: column;
      padding: 6px 14px;
      background: var(--abhi-surface-inset, #080e18);
      border: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      border-radius: 14px;
      box-shadow: var(--abhi-inset-shadow, inset 4px 4px 10px rgba(0,0,0,0.4));
      text-align: center;
    }

    .metric-label {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--abhi-text-muted, #8193ac);
    }

    .metric-value {
      font-size: 13px;
      font-family: monospace;
      font-weight: 700;
    }

    .cyan-val { color: var(--abhi-cyan, #38d9ff); }
    .blue-val { color: var(--abhi-blue, #397bff); }

    .library-action-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: linear-gradient(135deg, var(--abhi-blue, #397bff) 0%, var(--abhi-cyan, #38d9ff) 100%);
      color: #ffffff;
      font-weight: 700;
      font-size: 12px;
      border: none;
      border-radius: var(--abhi-radius-control, 18px);
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(56, 217, 255, 0.35);
      transition: all var(--abhi-transition-fast, 160ms);
    }

    .library-action-btn:hover {
      box-shadow: 0 6px 20px rgba(56, 217, 255, 0.55);
    }

    /* Search Card */
    .library-search-card {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 16px 20px;
      background: var(--abhi-surface-raised, #0e1828);
      border: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      border-radius: var(--abhi-radius-control, 18px);
      box-shadow: var(--abhi-raised-shadow, 9px 9px 22px rgba(0, 0, 0, 0.43));
    }

    .search-input-row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .search-input-wrapper {
      flex: 1;
      min-width: 280px;
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--abhi-surface-inset, #080e18);
      border: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      border-radius: 14px;
      padding: 6px 14px;
      box-shadow: var(--abhi-inset-shadow, inset 4px 4px 10px rgba(0,0,0,0.4));
    }

    .search-icon {
      font-size: 14px;
      color: var(--abhi-text-muted, #8193ac);
    }

    .library-search-field {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--abhi-text-primary, #eef5ff);
      font-size: 13px;
    }

    .modes-pill-group {
      display: flex;
      background: var(--abhi-surface-inset, #080e18);
      border: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      border-radius: 14px;
      padding: 3px;
      gap: 4px;
    }

    .mode-chip {
      padding: 6px 10px;
      border: none;
      background: transparent;
      border-radius: 10px;
      color: var(--abhi-text-muted, #8193ac);
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: all var(--abhi-transition-fast, 160ms);
    }

    .mode-chip.active {
      background: var(--abhi-surface-raised, #0e1828);
      color: var(--abhi-cyan, #38d9ff);
      box-shadow: var(--abhi-raised-shadow, 9px 9px 22px rgba(0,0,0,0.43));
    }

    .filters-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      flex-wrap: wrap;
      padding-top: 10px;
      border-top: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .filter-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--abhi-text-muted, #8193ac);
    }

    .filter-chip {
      padding: 4px 10px;
      background: var(--abhi-surface-inset, #080e18);
      border: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      border-radius: 10px;
      color: var(--abhi-text-secondary, #a7b7cc);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--abhi-transition-fast, 160ms);
    }

    .filter-chip.active {
      border-color: var(--abhi-cyan, #38d9ff);
      color: var(--abhi-cyan, #38d9ff);
      box-shadow: 0 0 10px rgba(56, 217, 255, 0.2);
    }

    .modal-triggers-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .collections-btn, .reuse-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: var(--abhi-surface-raised, #0e1828);
      border: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      border-radius: 12px;
      box-shadow: var(--abhi-raised-shadow, 9px 9px 22px rgba(0,0,0,0.43));
      color: var(--abhi-text-primary, #eef5ff);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--abhi-transition-fast, 160ms);
    }

    .collections-btn:hover { border-color: var(--abhi-blue, #397bff); color: var(--abhi-blue, #397bff); }
    .reuse-btn:hover { border-color: var(--abhi-success, #48dda2); color: var(--abhi-success, #48dda2); }

    /* Layout & Cards */
    .library-main-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
    }

    .library-main-grid.has-drawer {
      grid-template-columns: 1.4fr 1fr;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }

    .artifact-card {
      background: var(--abhi-surface-raised, #0e1828);
      border: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      border-radius: var(--abhi-radius-control, 18px);
      box-shadow: var(--abhi-raised-shadow, 9px 9px 22px rgba(0, 0, 0, 0.43));
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      cursor: pointer;
      transition: all var(--abhi-transition-fast, 160ms);
    }

    .artifact-card:hover {
      transform: translateY(-2px);
      border-color: var(--abhi-border-active, rgba(56, 217, 255, 0.42));
    }

    .artifact-card.selected {
      border-color: var(--abhi-cyan, #38d9ff);
      box-shadow: var(--abhi-raised-shadow), 0 0 16px rgba(56, 217, 255, 0.3);
    }

    .card-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .type-pill {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding: 2px 8px;
      border-radius: 8px;
      background: var(--abhi-surface-inset, #080e18);
      border: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      color: var(--abhi-cyan, #38d9ff);
    }

    .score-pill {
      font-size: 11px;
      font-family: monospace;
      color: var(--abhi-text-muted, #8193ac);
    }

    .score-val {
      color: var(--abhi-cyan, #38d9ff);
      font-weight: 700;
      margin-left: 4px;
    }

    .media-preview-box {
      height: 120px;
      background: var(--abhi-surface-inset, #080e18);
      border: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      border-radius: 12px;
      box-shadow: var(--abhi-inset-shadow, inset 4px 4px 10px rgba(0,0,0,0.4));
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 10px;
      text-align: center;
    }

    .preview-icon {
      font-size: 24px;
      margin-bottom: 4px;
      opacity: 0.8;
    }

    .preview-caption {
      font-size: 11px;
      color: var(--abhi-text-primary, #eef5ff);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .duration-badge {
      font-size: 9px;
      font-family: monospace;
      color: var(--abhi-text-muted, #8193ac);
      margin-top: 4px;
    }

    .card-footer-info {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-top: 6px;
      border-top: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      font-family: monospace;
      color: var(--abhi-text-muted, #8193ac);
    }

    .artifact-id-text {
      max-width: 100px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .match-reason-text {
      font-size: 10px;
      color: var(--abhi-cyan, #38d9ff);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tags-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .item-tag, .tag-chip {
      font-size: 9px;
      font-family: monospace;
      padding: 2px 6px;
      background: var(--abhi-surface-inset, #080e18);
      border: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      border-radius: 6px;
      color: var(--abhi-text-secondary, #a7b7cc);
    }

    /* Inspector Drawer */
    .inspector-drawer {
      background: var(--abhi-surface-raised, #0e1828);
      border: 1px solid var(--abhi-border-active, rgba(56, 217, 255, 0.42));
      border-radius: var(--abhi-radius-control, 18px);
      box-shadow: var(--abhi-raised-shadow, 9px 9px 22px rgba(0, 0, 0, 0.43));
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: 85vh;
      overflow-y: auto;
    }

    .inspector-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      padding-bottom: 10px;
    }

    .inspector-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--abhi-text-primary, #eef5ff);
      margin: 0;
    }

    .inspector-sub {
      font-size: 10px;
      font-family: monospace;
      color: var(--abhi-text-muted, #8193ac);
      margin: 2px 0 0 0;
    }

    .inspector-close-btn {
      background: none;
      border: none;
      color: var(--abhi-text-muted, #8193ac);
      cursor: pointer;
      font-size: 14px;
    }

    .inspector-actions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .action-pill {
      padding: 8px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all var(--abhi-transition-fast, 160ms);
    }

    .find-similar-btn {
      background: var(--abhi-surface-inset, #080e18);
      border: 1px solid var(--abhi-blue, #397bff);
      color: var(--abhi-blue, #397bff);
    }

    .reanalyze-btn {
      background: var(--abhi-surface-inset, #080e18);
      border: 1px solid var(--abhi-cyan, #38d9ff);
      color: var(--abhi-cyan, #38d9ff);
    }

    .inspector-section-card {
      background: var(--abhi-surface-inset, #080e18);
      border: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      border-radius: 14px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .section-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: var(--abhi-text-primary, #eef5ff);
      margin: 0;
    }

    .amber-title { color: var(--abhi-amber, #ffca70); }
    .violet-title { color: var(--abhi-accent-violet, #c084fc); }
    .emerald-title { color: var(--abhi-success, #48dda2); }

    .specs-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      font-size: 11px;
    }

    .spec-label {
      color: var(--abhi-text-muted, #8193ac);
    }

    .spec-val {
      font-family: monospace;
      color: var(--abhi-text-primary, #eef5ff);
      margin-left: 4px;
    }

    .caption-well, .ocr-well {
      background: var(--abhi-surface-raised, #0e1828);
      border: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      border-radius: 10px;
      padding: 8px 10px;
      font-size: 11px;
      color: var(--abhi-text-primary, #eef5ff);
      line-height: 1.4;
      margin: 4px 0 0 0;
    }

    .empty-state-card {
      padding: 40px 20px;
      text-align: center;
      background: var(--abhi-surface-raised, #0e1828);
      border: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      border-radius: var(--abhi-radius-control, 18px);
      box-shadow: var(--abhi-raised-shadow, 9px 9px 22px rgba(0, 0, 0, 0.43));
      color: var(--abhi-text-muted, #8193ac);
    }

    /* Modals */
    .modal-backdrop-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(5, 8, 17, 0.85);
      backdrop-filter: blur(16px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .modal-panel-shell {
      width: 100%;
      max-width: 480px;
      background: var(--abhi-surface-raised, #0e1828);
      border: 1px solid var(--abhi-border-active, rgba(56, 217, 255, 0.42));
      border-radius: var(--abhi-radius-control, 18px);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .wide-modal { max-width: 580px; }

    .modal-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      padding-bottom: 10px;
    }

    .modal-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--abhi-text-primary, #eef5ff);
      margin: 0;
    }

    .modal-close-btn {
      background: none;
      border: none;
      color: var(--abhi-text-muted, #8193ac);
      cursor: pointer;
      font-size: 15px;
    }

    .reuse-field {
      width: 100%;
      background: var(--abhi-surface-inset, #080e18);
      border: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      border-radius: 12px;
      padding: 8px 12px;
      color: var(--abhi-text-primary, #eef5ff);
      font-size: 12px;
      box-shadow: var(--abhi-inset-shadow, inset 4px 4px 10px rgba(0,0,0,0.4));
      outline: none;
      box-sizing: border-box;
    }

    .reuse-eval-btn {
      width: 100%;
      padding: 10px;
      background: linear-gradient(135deg, var(--abhi-success, #48dda2) 0%, #10b981 100%);
      border: none;
      border-radius: 12px;
      color: #050811;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
      margin-top: 8px;
    }

    .modal-btn {
      padding: 8px 18px;
      background: var(--abhi-surface-inset, #080e18);
      border: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      border-radius: 12px;
      color: var(--abhi-text-primary, #eef5ff);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }

    .modal-foot {
      display: flex;
      justify-content: flex-end;
      border-top: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      padding-top: 12px;
    }

    @media (max-width: 1024px) {
      .library-main-grid.has-drawer {
        grid-template-columns: 1fr;
      }
    }
  `]
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
