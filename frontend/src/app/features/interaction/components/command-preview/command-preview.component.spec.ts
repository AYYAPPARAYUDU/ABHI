import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CommandPreviewComponent } from './command-preview.component';
import { InteractionService } from '../../services/interaction.service';

describe('CommandPreviewComponent', () => {
  let component: CommandPreviewComponent;
  let fixture: ComponentFixture<CommandPreviewComponent>;
  let interactionServiceMock: Partial<InteractionService>;

  beforeEach(async () => {
    interactionServiceMock = {
      preview: signal({
        command: 'Open calculator',
        interpretedAction: 'OPEN_APPLICATION',
        target: 'calculator',
        source: 'TEXT',
        language: 'en',
        confidence: 0.95,
        status: 'Ready for Dispatch',
        requiresConsent: false,
        slots: {}
      }) as any,
      isBusy: signal(false) as any,
      executeCurrentPreview: vi.fn(),
      cancelInteraction: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [CommandPreviewComponent],
      providers: [
        { provide: InteractionService, useValue: interactionServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CommandPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the command preview component', () => {
    expect(component).toBeTruthy();
  });

  it('should trigger execution on execute button click', () => {
    component.execute();
    expect(interactionServiceMock.executeCurrentPreview).toHaveBeenCalled();
  });

  it('should trigger cancellation on cancel button click', () => {
    component.cancel();
    expect(interactionServiceMock.cancelInteraction).toHaveBeenCalled();
  });
});
