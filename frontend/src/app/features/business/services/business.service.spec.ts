import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { BusinessService } from './business.service';

describe('BusinessService', () => {
  let service: BusinessService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(BusinessService);
  });

  it('should be created with initial signals', () => {
    expect(service).toBeTruthy();
    expect(service.sectors()).toEqual([]);
    expect(service.projects()).toEqual([]);
    expect(service.opportunities()).toEqual([]);
    expect(service.financials()).toBeNull();
  });
});
