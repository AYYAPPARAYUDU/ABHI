import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorStateComponent } from './error-state.component';

describe('ErrorStateComponent', () => {
  let component: ErrorStateComponent;
  let fixture: ComponentFixture<ErrorStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorStateComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorStateComponent);
    component = fixture.componentInstance;
  });

  it('should create error state component', () => {
    component.message = 'Network timeout';
    expect(component).toBeTruthy();
  });

  it('should render message and emit retry event', () => {
    component.message = 'Failed to fetch task status';
    component.showRetry = true;
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.error-message')?.textContent).toContain('Failed to fetch task status');

    let retried = false;
    component.retry.subscribe(() => { retried = true; });

    const btn = el.querySelector('button');
    btn?.click();
    expect(retried).toBe(true);
  });
});
