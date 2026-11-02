import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SectorsDashboardComponent } from './sectors-dashboard.component';
import { BusinessSector } from '../../models/business.model';

describe('SectorsDashboardComponent', () => {
  let component: SectorsDashboardComponent;
  let fixture: ComponentFixture<SectorsDashboardComponent>;

  const mockSectors: BusinessSector[] = [
    {
      id: 'software_tools',
      name: 'Software Tools',
      description: 'Local dev tools',
      active_projects_count: 2,
      color: '#10b981',
      icon: 'terminal',
      position_3d: { x: 4.0, y: -2.0, z: 3.0 },
    },
    {
      id: 'automation_services',
      name: 'AI Automation Services',
      description: 'Local workflow automation',
      active_projects_count: 1,
      color: '#06b6d4',
      icon: 'cpu',
      position_3d: { x: -8.0, y: 2.0, z: -4.0 },
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectorsDashboardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SectorsDashboardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('sectors', mockSectors);
    fixture.detectChanges();
  });

  it('should create sectors dashboard component', () => {
    expect(component).toBeTruthy();
  });

  it('should render correct total projects count', () => {
    expect(component.totalProjects).toBe(3);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('AUTONOMOUS BUSINESS SECTORS');
    expect(compiled.textContent).toContain('Software Tools');
  });

  it('should emit sector id on click', () => {
    let selectedId = '';
    component.sectorSelect.subscribe((id) => (selectedId = id));
    component.onSelectSector('software_tools');
    expect(selectedId).toBe('software_tools');
  });
});
