import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ThreeSceneManagerService } from './three-scene-manager.service';

describe('ThreeSceneManagerService', () => {
  let service: ThreeSceneManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ThreeSceneManagerService]
    });
    service = TestBed.inject(ThreeSceneManagerService);
  });

  afterEach(() => {
    service.cleanup();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should switch spatial environment mode safely', () => {
    service.setMode('ACTIVE_TASK');
    service.setMode('MEDIA');
    service.setMode('SYSTEM');
    service.setMode('DEFAULT');
    expect(service).toBeTruthy();
  });

  it('should pause and resume rendering cleanly', () => {
    service.pause();
    service.resume();
    expect(service).toBeTruthy();
  });
});
