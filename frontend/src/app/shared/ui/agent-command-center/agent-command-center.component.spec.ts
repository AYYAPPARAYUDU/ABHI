import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AgentCommandCenterComponent } from './agent-command-center.component';
import { AgentCommandService } from '../../../core/services/agent-command.service';
import { OperatorStateService } from '../../../core/services/operator-state.service';
import { TaskApiService } from '../../../core/api/task-api.service';

describe('AgentCommandCenterComponent', () => {
  let component: AgentCommandCenterComponent;
  let fixture: ComponentFixture<AgentCommandCenterComponent>;
  let commandService: AgentCommandService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentCommandCenterComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        AgentCommandService,
        OperatorStateService,
        TaskApiService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AgentCommandCenterComponent);
    component = fixture.componentInstance;
    commandService = TestBed.inject(AgentCommandService);
    fixture.detectChanges();
  });

  it('should create command center component', () => {
    expect(component).toBeTruthy();
  });

  it('should render multilingual quick suggestions', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Open Calculator');
    expect(el.textContent).toContain('క్యాలిక్యులేటర్ తెరవండి');
    expect(el.textContent).toContain('कैलकुलेटर खोलें');
    expect(el.textContent).toContain('கால்குலேட்டரைத் திறக்கவும்');
  });

  it('should submit text command to AgentCommandService', async () => {
    const spy = vi.spyOn(commandService, 'submitCommand').mockResolvedValue(null);
    component.inputText = 'Open Calculator';
    await component.onSubmit();

    expect(spy).toHaveBeenCalledWith('Open Calculator', 'TEXT', 'auto');
    expect(component.inputText).toBe('');
  });

  it('should apply suggestion and submit', async () => {
    const spy = vi.spyOn(commandService, 'submitCommand').mockResolvedValue(null);
    component.applySuggestion('క్యాలిక్యులేటర్ తెరవండి', 'te');

    expect(component.selectedLanguage()).toBe('te');
    expect(spy).toHaveBeenCalledWith('క్యాలిక్యులేటర్ తెరవండి', 'TEXT', 'te');
  });

  it('should switch language from dropdown', () => {
    component.toggleLangMenu();
    expect(component.showLangMenu()).toBe(true);

    component.setLang('hi');
    expect(component.selectedLanguage()).toBe('hi');
    expect(component.currentLangLabel()).toBe('हिंदी');
    expect(component.showLangMenu()).toBe(false);
  });
});
