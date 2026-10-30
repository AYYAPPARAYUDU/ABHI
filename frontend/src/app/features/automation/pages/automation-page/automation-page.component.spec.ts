import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AutomationPageComponent } from './automation-page.component';

describe('AutomationPageComponent', () => {
  let component: AutomationPageComponent;
  let fixture: ComponentFixture<AutomationPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AutomationPageComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AutomationPageComponent);
    component = fixture.componentInstance;
  });

  it('should create AutomationPageComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should have canonical automation presets', () => {
    expect(component.presets().length).toBeGreaterThanOrEqual(5);
  });
});
