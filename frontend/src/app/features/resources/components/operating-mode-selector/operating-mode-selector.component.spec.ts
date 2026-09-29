import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OperatingModeSelectorComponent } from './operating-mode-selector.component';

describe('OperatingModeSelectorComponent', () => {
  let component: OperatingModeSelectorComponent;
  let fixture: ComponentFixture<OperatingModeSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperatingModeSelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OperatingModeSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should emit modeChange when clicking mode button', () => {
    const emitSpy = vi.spyOn(component.modeChange, 'emit');
    component.onSelectMode('PERFORMANCE');
    expect(emitSpy).toHaveBeenCalledWith('PERFORMANCE');
  });

  it('should return correct dot class based on pressure level', () => {
    expect(component.getPressureDotClass()).toContain('emerald');
  });
});
