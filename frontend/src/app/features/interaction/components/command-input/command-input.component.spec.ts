import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommandInputComponent } from './command-input.component';
import { InteractionService } from '../../services/interaction.service';

describe('CommandInputComponent', () => {
  let component: CommandInputComponent;
  let fixture: ComponentFixture<CommandInputComponent>;
  let interactionServiceMock: Partial<InteractionService>;

  beforeEach(async () => {
    interactionServiceMock = {
      submitTextCommand: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [CommandInputComponent],
      providers: [
        { provide: InteractionService, useValue: interactionServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CommandInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the command input component', () => {
    expect(component).toBeTruthy();
  });

  it('should update text and submit command on enter', () => {
    component.onTextChange('Open calculator');
    component.submit();
    expect(interactionServiceMock.submitTextCommand).toHaveBeenCalledWith('Open calculator', 'auto');
  });

  it('should clear text when clear is called', () => {
    component.onTextChange('Some text');
    component.clear();
    expect(component.commandText()).toBe('');
  });
});
