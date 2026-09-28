import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  let component: EmptyStateComponent;
  let fixture: ComponentFixture<EmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyStateComponent);
    component = fixture.componentInstance;
  });

  it('should create empty state component', () => {
    expect(component).toBeTruthy();
  });

  it('should render custom title and message', () => {
    component.title = 'No Tasks Found';
    component.message = 'Submit a new automation task above.';
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.empty-state-title')?.textContent).toContain('No Tasks Found');
    expect(el.querySelector('.empty-state-message')?.textContent).toContain('Submit a new automation task above.');
  });
});
