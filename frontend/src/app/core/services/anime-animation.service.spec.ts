import { describe, it, expect, beforeEach } from 'vitest';
import { AnimeAnimationService } from './anime-animation.service';
import { NgZone } from '@angular/core';

describe('AnimeAnimationService', () => {
  let service: AnimeAnimationService;
  const mockNgZone = {
    runOutsideAngular: (fn: Function) => fn()
  } as unknown as NgZone;

  beforeEach(() => {
    service = new AnimeAnimationService(mockNgZone);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initiate stagger entrance animation', () => {
    const el = document.createElement('div');
    const anim = service.staggerEnter({
      targets: el,
      duration: 100
    });
    expect(anim).toBeTruthy();
  });

  it('should initiate tactile click animation', () => {
    const el = document.createElement('button');
    const anim = service.tactileClick(el);
    expect(anim).toBeTruthy();
  });

  it('should initiate hover lift animation', () => {
    const el = document.createElement('div');
    const anim = service.hoverLift(el, true);
    expect(anim).toBeTruthy();
  });

  it('should initiate countUp animation', () => {
    const obj = { value: 0 };
    const anim = service.countUp(obj, 100, { duration: 100 });
    expect(anim).toBeTruthy();
  });

  it('should initiate modal pop in timeline', () => {
    const modal = document.createElement('div');
    const backdrop = document.createElement('div');
    const tl = service.popInModal(modal, backdrop);
    expect(tl).toBeTruthy();
  });
});
