import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NeuralNetworkViewerComponent } from './neural-network-viewer.component';

describe('NeuralNetworkViewerComponent', () => {
  let component: NeuralNetworkViewerComponent;
  let fixture: ComponentFixture<NeuralNetworkViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NeuralNetworkViewerComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NeuralNetworkViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create NeuralNetworkViewerComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default tokens and layers', () => {
    expect(component.tokens().length).toBeGreaterThan(0);
    expect(component.layerActivations().length).toBe(28);
  });

  it('should select token when clicked', () => {
    component.selectToken(1);
    expect(component.selectedTokenIndex()).toBe(1);
  });

  it('should update prompt and run inspection', () => {
    component.setQuickPrompt('ABHI Dual-State Verification');
    expect(component.promptInput).toBe('ABHI Dual-State Verification');
  });
});
