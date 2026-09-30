import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HomePageComponent } from './home-page.component';
import { OperatorStateService } from '../../../../core/services/operator-state.service';

describe('HomePageComponent', () => {
  let component: HomePageComponent;
  let fixture: ComponentFixture<HomePageComponent>;
  let stateService: OperatorStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomePageComponent);
    component = fixture.componentInstance;
    stateService = TestBed.inject(OperatorStateService);
    fixture.detectChanges();
  });

  it('should create home page component', () => {
    expect(component).toBeTruthy();
  });

  it('should render core identity greeting and command input', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Hello, Operator');
    expect(compiled.querySelector('.command-input')).toBeTruthy();
  });

  it('should apply suggestion chip to command input', () => {
    const suggestion = 'Open Calculator';
    component.applySuggestion(suggestion);
    expect(component.commandText).toBe(suggestion);
  });
});
