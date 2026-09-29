import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModelLineage3dComponent } from './model-lineage-3d.component';
import { EvaluationService } from '../../services/evaluation.service';
import { describe, beforeEach, it, expect } from 'vitest';

describe('ModelLineage3dComponent', () => {
  let component: ModelLineage3dComponent;
  let fixture: ComponentFixture<ModelLineage3dComponent>;

  const mockEvalService = {
    lineageNodes: () => [
      {
        node_id: 'node_base_qwen3_8b',
        name: 'Qwen3-8B Base',
        version: '1.0.0',
        node_type: 'BASE_MODEL',
        parent_id: null,
        composite_score: 0.917,
        status: 'PRODUCTION',
        is_current_prod: true,
        created_at: '2026-09-01T00:00:00Z',
        metadata: { runtime: 'Ollama' }
      }
    ]
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModelLineage3dComponent],
      providers: [
        { provide: EvaluationService, useValue: mockEvalService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ModelLineage3dComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create 3d model lineage component', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle node inspector', () => {
    component.selectedNode = mockEvalService.lineageNodes()[0] as any;
    expect(component.selectedNode).toBeTruthy();
    component.closeInspect();
    expect(component.selectedNode).toBeNull();
  });
});
