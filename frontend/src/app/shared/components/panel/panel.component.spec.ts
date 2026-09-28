import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PanelComponent } from './panel.component';

describe('PanelComponent', () => {
  let component: PanelComponent;
  let fixture: ComponentFixture<PanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PanelComponent);
    component = fixture.componentInstance;
  });

  it('should create panel component', () => {
    expect(component).toBeTruthy();
  });

  it('should display title and icon', () => {
    component.title = 'OPERATOR MATRIX';
    component.icon = '🛡️';
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.panel-title')?.textContent).toContain('OPERATOR MATRIX');
    expect(el.querySelector('.panel-icon')?.textContent).toContain('🛡️');
  });
});
