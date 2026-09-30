import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SpatialCardComponent } from './spatial-card.component';

describe('SpatialCardComponent', () => {
  let component: SpatialCardComponent;
  let fixture: ComponentFixture<SpatialCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpatialCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SpatialCardComponent);
    component = fixture.componentInstance;
  });

  it('should create the spatial card component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render title and status text', () => {
    fixture.componentRef.setInput('title', 'Test 3D Card');
    fixture.componentRef.setInput('statusText', 'Verified');
    fixture.componentRef.setInput('status', 'COMPLETED');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Test 3D Card');
    expect(compiled.textContent).toContain('Verified');
  });

  it('should handle pointer tilt effect on mouse move', () => {
    fixture.componentRef.setInput('interactive', true);
    fixture.detectChanges();

    const cardEl = fixture.nativeElement.querySelector('.spatial-card-frame') as HTMLElement;
    const event = new MouseEvent('mousemove', { clientX: 100, clientY: 100 });
    component.onMouseMove(event);

    expect(component.transformStyle()).toContain('perspective(1000px)');
  });

  it('should reset transform style on mouse leave', () => {
    fixture.detectChanges();
    component.onMouseLeave();
    expect(component.transformStyle()).toBe('perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)');
  });
});
