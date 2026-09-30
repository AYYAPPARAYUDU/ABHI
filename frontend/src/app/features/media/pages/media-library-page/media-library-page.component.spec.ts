import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MediaLibraryPageComponent } from './media-library-page.component';
import { MediaService } from '../../services/media.service';
import { of } from 'rxjs';

describe('MediaLibraryPageComponent', () => {
  let component: MediaLibraryPageComponent;
  let fixture: ComponentFixture<MediaLibraryPageComponent>;
  let mediaService: MediaService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MediaLibraryPageComponent],
      providers: [
        MediaService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MediaLibraryPageComponent);
    component = fixture.componentInstance;
    mediaService = TestBed.inject(MediaService);
  });

  it('should create the MediaLibraryPageComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with HYBRID search mode and trigger initial search', () => {
    const searchSpy = vi.spyOn(mediaService, 'searchLibrary').mockReturnValue(of([]));
    component.ngOnInit();
    expect(component.selectedMode()).toBe('HYBRID');
    expect(searchSpy).toHaveBeenCalled();
  });

  it('should switch search mode and filter by media type', () => {
    const searchSpy = vi.spyOn(mediaService, 'searchLibrary').mockReturnValue(of([]));
    component.setSearchMode('SEMANTIC');
    expect(component.selectedMode()).toBe('SEMANTIC');
    expect(searchSpy).toHaveBeenCalled();

    component.toggleMediaType('VIDEO');
    expect(component.selectedType()).toBe('VIDEO');
  });

  it('should select artifact and fetch detailed understanding', () => {
    const getUndSpy = vi.spyOn(mediaService, 'getMediaUnderstanding').mockReturnValue(of({
      understanding_id: 'und_123',
      artifact_id: 'art_123',
      media_type: 'IMAGE',
      analysis_version: 'analysis.media@1.0.0',
      technical_metadata: {},
      caption: 'A futuristic city',
      environment: 'city',
      visual_style: 'cyberpunk',
      dominant_colors: ['cyan', 'magenta'],
      language: 'en',
      entities: [],
      objects: [],
      scene_labels: [],
      visual_tags: ['cyberpunk', 'neon'],
      ocr_blocks: [],
      scenes: [],
      audio_segments: [],
      embedding_references: [],
      is_quarantined: false,
      provenance_class: 'ACTUAL_MODEL_INFERENCE',
      created_at: 1000,
      updated_at: 1000,
    }));

    const mockResult = {
      artifact_id: 'art_123',
      score: 0.95,
      media_type: 'IMAGE',
      filename: 'art_123.png',
      file_path: 'data/artifacts/art_123',
      language: 'en',
      provenance: 'ACTUAL_MODEL_INFERENCE',
      match_reason: 'Vector match',
      technical_metadata: {},
      tags: ['cyberpunk'],
      scenes_count: 0,
      created_at: 1000,
    };

    component.selectArtifact(mockResult);
    expect(component.selectedArtifact()).toEqual(mockResult);
    expect(getUndSpy).toHaveBeenCalledWith('art_123');
  });
});
