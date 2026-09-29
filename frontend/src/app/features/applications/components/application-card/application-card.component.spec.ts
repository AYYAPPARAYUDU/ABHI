import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ApplicationCardComponent } from './application-card.component';
import { ApplicationItem } from '../../models/application.model';

describe('ApplicationCardComponent', () => {
  let component: ApplicationCardComponent;
  let fixture: ComponentFixture<ApplicationCardComponent>;

  const mockApp: ApplicationItem = {
    application_id: 'notepad',
    display_name: 'Notepad',
    executable_names: ['notepad.exe'],
    icon_name: 'file-text',
    description: 'Windows Notepad',
    enabled: true,
    state: 'RUNNING',
    capabilities_count: 7,
    capabilities: []
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ApplicationCardComponent);
    component = fixture.componentInstance;
    component.application = mockApp;
    fixture.detectChanges();
  });

  it('should create the card component', () => {
    expect(component).toBeTruthy();
  });

  it('should render application name and capabilities count', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Notepad');
    expect(compiled.textContent).toContain('7 capabilities');
  });

  it('should emit selectApp on card click', () => {
    const spy = vi.spyOn(component.selectApp, 'emit');
    component.onCardClick();
    expect(spy).toHaveBeenCalledWith('notepad');
  });

  it('should emit toggleApp on switch toggle', () => {
    const spy = vi.spyOn(component.toggleApp, 'emit');
    const event = { stopPropagation: () => {}, target: { checked: false } } as unknown as Event;
    component.onToggle(event);
    expect(spy).toHaveBeenCalledWith({ id: 'notepad', enabled: false });
  });

  it('should emit launchApp on launch button click', () => {
    const spy = vi.spyOn(component.launchApp, 'emit');
    const event = { stopPropagation: () => {} } as unknown as Event;
    component.onLaunch(event);
    expect(spy).toHaveBeenCalledWith('notepad');
  });

  it('should emit focusApp on focus button click', () => {
    const spy = vi.spyOn(component.focusApp, 'emit');
    const event = { stopPropagation: () => {} } as unknown as Event;
    component.onFocus(event);
    expect(spy).toHaveBeenCalledWith('notepad');
  });

  it('should return correct badge classes for state', () => {
    expect(component.getStateBadgeClass('RUNNING')).toContain('text-success');
    expect(component.getStateBadgeClass('FOCUSED')).toContain('text-info');
    expect(component.getStateBadgeClass('NOT_RUNNING')).toContain('text-muted');
  });
});

