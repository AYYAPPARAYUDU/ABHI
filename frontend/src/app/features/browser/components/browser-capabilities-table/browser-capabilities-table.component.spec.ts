import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserCapabilitiesTableComponent } from './browser-capabilities-table.component';

describe('BrowserCapabilitiesTableComponent', () => {
  let component: BrowserCapabilitiesTableComponent;
  let fixture: ComponentFixture<BrowserCapabilitiesTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowserCapabilitiesTableComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BrowserCapabilitiesTableComponent);
    component = fixture.componentInstance;
    component.capabilities = [
      {
        name: 'open_url',
        skill_id: 'browser.open_url',
        risk_level: 'LOW',
        permissions: ['BROWSER_NAVIGATE'],
        description: 'Open an approved HTTP/HTTPS URL',
        verification_policy: 'URL_ORIGIN_MATCH'
      }
    ];
    fixture.detectChanges();
  });

  it('should create table component', () => {
    expect(component).toBeTruthy();
  });

  it('should render capability rows with skill ID and policy tag', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('open_url');
    expect(el.textContent).toContain('browser.open_url');
    expect(el.textContent).toContain('URL_ORIGIN_MATCH');
  });
});
