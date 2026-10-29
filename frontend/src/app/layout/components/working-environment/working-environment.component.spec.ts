import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { WorkingEnvironmentComponent, WORKING_ENVIRONMENTS } from './working-environment.component';

describe('WorkingEnvironmentComponent', () => {
  let component: WorkingEnvironmentComponent;
  let fixture: ComponentFixture<WorkingEnvironmentComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkingEnvironmentComponent],
      providers: [
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WorkingEnvironmentComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create working environment component', () => {
    expect(component).toBeTruthy();
  });

  it('should render 11 working environments in the navigation ribbon', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const track = compiled.querySelector('.environments-track.bar-nav-ribbon');
    expect(track).toBeTruthy();
    expect(component.environments.length).toBe(11);
    const buttons = compiled.querySelectorAll('.env-btn');
    expect(buttons.length).toBe(11);
  });

  it('should correctly identify active route for /home and secondary paths', () => {
    vi.spyOn(router, 'url', 'get').mockReturnValue('/home');
    expect(component.isActive('/home')).toBe(true);
    expect(component.isActive('/decision-pipeline')).toBe(false);

    vi.spyOn(router, 'url', 'get').mockReturnValue('/decision-pipeline');
    expect(component.isActive('/decision-pipeline')).toBe(true);
    expect(component.isActive('/home')).toBe(false);
  });

  it('should navigate to target environment when clicked', () => {
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    component.navigateTo('/decision-pipeline');
    expect(navigateSpy).toHaveBeenCalledWith('/decision-pipeline');
  });

  it('should render environment sector tag', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const sectorTag = compiled.querySelector('.env-sector-tag');
    expect(sectorTag).toBeTruthy();
    expect(sectorTag?.textContent).toContain('WORKSPACES');
  });
});
