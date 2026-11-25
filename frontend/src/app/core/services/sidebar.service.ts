import { Injectable, signal, computed, effect } from '@angular/core';

export type SidebarState = 'open' | 'compact' | 'closed';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private readonly STORAGE_KEY = 'abhi_sidebar_state';
  private readonly MOBILE_BREAKPOINT = 992;

  readonly isOpen = signal<boolean>(true);
  readonly isCompact = signal<boolean>(false);
  readonly isMobile = signal<boolean>(false);

  // Computed width in px for layout synchronization
  readonly widthPx = computed(() => {
    if (!this.isOpen()) return 0;
    if (this.isCompact()) return 64;
    return 240;
  });

  constructor() {
    this.initFromEnvironment();
  }

  private initFromEnvironment(): void {
    if (typeof window === 'undefined') return;

    const isSmall = window.innerWidth < this.MOBILE_BREAKPOINT;
    this.isMobile.set(isSmall);

    if (isSmall) {
      this.isOpen.set(false);
      this.isCompact.set(false);
    } else {
      this.restoreDesktopState();
    }

    window.addEventListener('resize', this.onResize);
  }

  private readonly onResize = (): void => {
    if (typeof window === 'undefined') return;
    const isSmall = window.innerWidth < this.MOBILE_BREAKPOINT;
    const wasMobile = this.isMobile();
    this.isMobile.set(isSmall);

    if (!wasMobile && isSmall) {
      // Transitioning to mobile: close sidebar drawer
      this.isOpen.set(false);
    } else if (wasMobile && !isSmall) {
      // Transitioning to desktop: restore saved state
      this.restoreDesktopState();
    }
  };

  private restoreDesktopState(): void {
    if (typeof localStorage === 'undefined') {
      this.isOpen.set(true);
      this.isCompact.set(false);
      return;
    }

    try {
      const saved = localStorage.getItem(this.STORAGE_KEY) as SidebarState | null;
      if (saved === 'closed') {
        this.isOpen.set(false);
        this.isCompact.set(false);
      } else if (saved === 'compact') {
        this.isOpen.set(true);
        this.isCompact.set(true);
      } else {
        // default to open
        this.isOpen.set(true);
        this.isCompact.set(false);
      }
    } catch {
      this.isOpen.set(true);
      this.isCompact.set(false);
    }
  }

  private persistState(): void {
    if (typeof localStorage === 'undefined') return;
    // On mobile, drawer toggling does not overwrite the preferred desktop layout
    if (this.isMobile()) return;

    try {
      let state: SidebarState = 'open';
      if (!this.isOpen()) {
        state = 'closed';
      } else if (this.isCompact()) {
        state = 'compact';
      } else {
        state = 'open';
      }
      localStorage.setItem(this.STORAGE_KEY, state);
    } catch {
      // LocalStorage access restricted or unavailable
    }
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    this.isOpen.set(true);
    this.persistState();
  }

  close(): void {
    this.isOpen.set(false);
    this.persistState();
  }

  setCompact(compact: boolean): void {
    this.isCompact.set(compact);
    if (compact) {
      this.isOpen.set(true);
    }
    this.persistState();
  }

  toggleCompact(): void {
    this.setCompact(!this.isCompact());
  }
}
