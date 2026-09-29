import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { HardwareGaugePanelComponent } from './hardware-gauge-panel.component';

describe('HardwareGaugePanelComponent', () => {
  let component: HardwareGaugePanelComponent;
  let fixture: ComponentFixture<HardwareGaugePanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HardwareGaugePanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HardwareGaugePanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render default CPU and RAM labels', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Processor (CPU)');
    expect(compiled.textContent).toContain('System Memory (RAM)');
    expect(compiled.textContent).toContain('Discrete GPU & VRAM');
  });
});
