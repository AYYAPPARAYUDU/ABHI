import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { ContextualTopbarComponent } from './contextual-topbar.component';
import { OperatorStateService } from '../../../core/services/operator-state.service';

describe('ContextualTopbarComponent', () => {
  let component: ContextualTopbarComponent;
  let fixture: ComponentFixture<ContextualTopbarComponent>;
  let stateService: OperatorStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContextualTopbarComponent],
      providers: [
        provideRouter([]),
        provideHttpClient()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ContextualTopbarComponent);
    component = fixture.componentInstance;
    stateService = TestBed.inject(OperatorStateService);
    fixture.detectChanges();
  });

  it('should create contextual topbar component', () => {
    expect(component).toBeTruthy();
  });

  it('should switch user experience mode', () => {
    component.setMode('ADVANCED');
    expect(stateService.userMode()).toBe('ADVANCED');
    component.setMode('DEVELOPER');
    expect(stateService.userMode()).toBe('DEVELOPER');
  });

  it('should trigger emergency stop', () => {
    const estopBtn = fixture.nativeElement.querySelector('.estop-btn') as HTMLButtonElement;
    expect(estopBtn).toBeTruthy();
    estopBtn.click();
    expect(stateService.safety().emergencyStopped).toBe(true);
  });
});
