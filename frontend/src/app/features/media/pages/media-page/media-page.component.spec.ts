import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { MediaPageComponent } from './media-page.component';
import { MediaService } from '../../services/media.service';

describe('MediaPageComponent', () => {
  let component: MediaPageComponent;
  let fixture: ComponentFixture<MediaPageComponent>;
  let mediaService: MediaService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MediaPageComponent, HttpClientTestingModule],
      providers: [MediaService],
    }).compileComponents();

    mediaService = TestBed.inject(MediaService);
    vi.spyOn(mediaService, 'refreshAll').mockImplementation(() => {});
    vi.spyOn(mediaService, 'generateImage').mockReturnValue(of({} as any));
    vi.spyOn(mediaService, 'cancelJob').mockReturnValue(of({} as any));
    vi.spyOn(mediaService, 'deleteArtifact').mockReturnValue(of({} as any));

    fixture = TestBed.createComponent(MediaPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the page component', () => {
    expect(component).toBeTruthy();
  });

  it('should call refreshAll on initialization', () => {
    expect(mediaService.refreshAll).toHaveBeenCalled();
  });

  it('should delegate generateImage call to service', () => {
    component.onGenerate({
      prompt: 'A golden temple',
      model_id: 'sd-turbo-local',
      width: 512,
      height: 512,
      steps: 20,
      output_format: 'PNG',
    });
    expect(mediaService.generateImage).toHaveBeenCalled();
  });

  it('should delegate cancelJob and deleteArtifact calls to service', () => {
    component.onCancelJob('job_test_1');
    expect(mediaService.cancelJob).toHaveBeenCalledWith('job_test_1');

    component.onDeleteArtifact('art_test_1');
    expect(mediaService.deleteArtifact).toHaveBeenCalledWith('art_test_1');
  });
});
