import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MemoryDetailComponent } from './memory-detail.component';
import { MemoryService } from '../../services/memory.service';

describe('MemoryDetailComponent', () => {
  let component: MemoryDetailComponent;
  let fixture: ComponentFixture<MemoryDetailComponent>;
  let memoryServiceMock: Partial<MemoryService>;

  beforeEach(async () => {
    memoryServiceMock = {
      selectedMemory: signal({
        memory_id: 'mem_xyz_789',
        memory_type: 'PREFERENCE',
        title: 'Preferred Theme',
        category: 'ui',
        context_summary: 'User preferred dark theme',
        solution_summary: 'Applied dark mode setting to console',
        summary: 'Applied dark mode setting to console',
        content: { theme: 'dark', accent: 'cyan' },
        outcome: 'SUCCESS',
        tags: ['theme', 'dark'],
        confidence: 1.0,
        privacy_class: 'user_provided',
        privacy_classification: 'PERSONAL',
        status: 'CANDIDATE',
        source: 'USER_EXPLICIT',
        confirmed_by_user: false,
        created_at: new Date().toISOString()
      }) as any,
      confirmMemory: vi.fn(),
      rejectMemory: vi.fn(),
      forgetMemory: vi.fn(),
      clearSelection: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [MemoryDetailComponent],
      providers: [
        { provide: MemoryService, useValue: memoryServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MemoryDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create memory detail component', () => {
    expect(component).toBeTruthy();
  });

  it('should render selected memory title and content', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Preferred Theme');
    expect(compiled.textContent).toContain('100% Confidence');
    expect(compiled.textContent).toContain('STRUCTURED PAYLOAD');
  });

  it('should trigger confirmMemory on confirm button click', () => {
    component.onConfirm();
    expect(memoryServiceMock.confirmMemory).toHaveBeenCalledWith('mem_xyz_789');
  });

  it('should trigger rejectMemory on reject button click', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('Invalid memory');
    component.onReject();
    expect(memoryServiceMock.rejectMemory).toHaveBeenCalledWith('mem_xyz_789', 'Invalid memory');
  });

  it('should trigger forgetMemory on privacy erasure click', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.onForget('PRIVACY_ERASURE');
    expect(memoryServiceMock.forgetMemory).toHaveBeenCalledWith('mem_xyz_789', 'PRIVACY_ERASURE');
  });
});
