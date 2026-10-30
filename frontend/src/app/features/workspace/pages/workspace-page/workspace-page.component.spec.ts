import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkspacePageComponent } from './workspace-page.component';

describe('WorkspacePageComponent', () => {
  let component: WorkspacePageComponent;
  let fixture: ComponentFixture<WorkspacePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspacePageComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(WorkspacePageComponent);
    component = fixture.componentInstance;
  });

  it('should create WorkspacePageComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should have initial family consensus score', () => {
    expect(component.consensusScore()).toBeGreaterThanOrEqual(98.0);
  });
});
