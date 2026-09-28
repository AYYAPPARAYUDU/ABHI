import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatusIndicatorComponent } from './status-indicator.component';

describe('StatusIndicatorComponent', () => {
  let component: StatusIndicatorComponent;
  let fixture: ComponentFixture<StatusIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusIndicatorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(StatusIndicatorComponent);
    component = fixture.componentInstance;
  });

  it('should create status indicator component', () => {
    expect(component).toBeTruthy();
  });

  it('should render correct status label', () => {
    component.status = 'HEALTHY';
    component.label = 'OPERATIONAL';
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.status-label')?.textContent?.trim()).toBe('OPERATIONAL');
  });
});
