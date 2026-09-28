import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SectionHeaderComponent } from './section-header.component';

describe('SectionHeaderComponent', () => {
  let component: SectionHeaderComponent;
  let fixture: ComponentFixture<SectionHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectionHeaderComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SectionHeaderComponent);
    component = fixture.componentInstance;
  });

  it('should create section header component', () => {
    component.title = 'TEST SECTION';
    expect(component).toBeTruthy();
  });

  it('should render title and subtitle', () => {
    component.title = 'SYSTEM TELEMETRY';
    component.subtitle = 'LIVE METRICS';
    component.icon = '📡';
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.header-title')?.textContent).toContain('SYSTEM TELEMETRY');
    expect(el.querySelector('.header-subtitle')?.textContent).toContain('LIVE METRICS');
    expect(el.querySelector('.header-icon')?.textContent).toContain('📡');
  });
});
