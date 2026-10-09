import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { IntelligencePageComponent } from './intelligence-page.component';
import { EvaluationService } from '../../../llm-evaluation/services/evaluation.service';

describe('IntelligencePageComponent', () => {
  let component: IntelligencePageComponent;
  let fixture: ComponentFixture<IntelligencePageComponent>;
  let evalService: EvaluationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntelligencePageComponent],
      providers: [provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(IntelligencePageComponent);
    component = fixture.componentInstance;
    evalService = TestBed.inject(EvaluationService);
    fixture.detectChanges();
  });

  it('should create intelligence page component', () => {
    expect(component).toBeTruthy();
  });

  it('should render honest training capability notice', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('TRAINING RUNTIME CAPABILITY:');
    expect(compiled.textContent).toContain('FULL BACKPROP NOT_AVAILABLE');
  });

  it('should switch tabs cleanly', () => {
    expect(evalService.activeTab()).toBe('DAILY');
    evalService.setActiveTab('CANDIDATES');
    expect(evalService.activeTab()).toBe('CANDIDATES');
  });
});
