import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResourceMonitorComponent } from './resource-monitor.component';
import { EvaluationService } from '../../services/evaluation.service';
import { describe, beforeEach, it, expect } from 'vitest';

describe('ResourceMonitorComponent', () => {
  let component: ResourceMonitorComponent;
  let fixture: ComponentFixture<ResourceMonitorComponent>;

  const mockEvalService = {
    resourceHeadroom: () => ({
      status: 'RESOURCE_HEADROOM_OK',
      is_training_safe: true,
      metrics: {
        cpu_percent: 14.2,
        free_ram_mb: 13500,
        free_vram_mb: 4800
      }
    })
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResourceMonitorComponent],
      providers: [
        { provide: EvaluationService, useValue: mockEvalService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResourceMonitorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create resource monitor component', () => {
    expect(component).toBeTruthy();
  });

  it('should display hardware metrics correctly', () => {
    expect(component.isSafe).toBe(true);
    expect(component.cpu).toBe(14.2);
    expect(component.freeRam).toBe(13500);
    expect(component.freeVram).toBe(4800);
  });
});
