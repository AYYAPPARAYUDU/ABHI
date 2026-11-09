import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { getApiUrl } from '../../../../core/config/api-config';
import { SpeechVoiceService } from '../../../../core/services/speech-voice.service';

@Component({
  selector: 'app-mobile-screen-hub',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mobile-screen-hub.component.html',
  styleUrl: './mobile-screen-hub.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MobileScreenHubComponent implements OnInit, OnDestroy {
  readonly speechVoice = inject(SpeechVoiceService);

  readonly isOpen = signal<boolean>(false);
  readonly activeTab = signal<'MOBILE_MIRROR' | 'LAPTOP_MIRROR' | 'SETTINGS'>('MOBILE_MIRROR');
  readonly connectionMode = signal<'USB_DIRECT' | 'WIFI_ADB' | 'BLUETOOTH'>('USB_DIRECT');

  // Screen streams
  readonly mobileScreenUrl = signal<string>(getApiUrl('/api/v1/devices/mobile/screenshot'));
  readonly desktopScreenUrl = signal<string>(getApiUrl('/api/v1/devices/desktop/screenshot'));
  readonly isRefreshingScreen = signal<boolean>(false);
  readonly autoRefresh = signal<boolean>(true);

  // Device telemetry & identifiers
  readonly mobileStatus = signal<any>(null);
  readonly imeiInfo = signal<any>(null);
  readonly bluetoothDevices = signal<any[]>([]);
  readonly isConnected = computed(() => this.mobileStatus()?.connected === true);

  // Settings & Gestures
  readonly screenBrightness = signal<number>(180);
  readonly musicVolume = signal<number>(12);
  readonly quickTextInput = signal<string>('');
  readonly remoteLaptopCommand = signal<string>('');
  readonly lastActionFeedback = signal<string | null>(null);

  // Direct Screen Touch Ripple
  readonly touchRipple = signal<{ x: number; y: number; active: boolean; label?: string }>({ x: 0, y: 0, active: false });
  private pointerDownX = 0;
  private pointerDownY = 0;
  private pointerDownTime = 0;

  // Wi-Fi Connect inputs
  wifiIp = '192.168.1.105';
  wifiPort = 5555;
  readonly isConnectingWifi = signal<boolean>(false);

  private screenRefreshTimer: any = null;
  private statusPollTimer: any = null;

  ngOnInit(): void {
    this.refreshAllData();
    this.statusPollTimer = setInterval(() => this.refreshStatus(), 5000);
    this.startScreenAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopScreenAutoRefresh();
    if (this.statusPollTimer) {
      clearInterval(this.statusPollTimer);
      this.statusPollTimer = null;
    }
  }

  open(): void {
    this.isOpen.set(true);
    this.refreshAllData();
    this.refreshMobileScreen();
  }

  close(): void {
    this.isOpen.set(false);
  }

  toggleAutoRefresh(): void {
    const next = !this.autoRefresh();
    this.autoRefresh.set(next);
    if (next) {
      this.startScreenAutoRefresh();
    } else {
      this.stopScreenAutoRefresh();
    }
  }

  private startScreenAutoRefresh(): void {
    this.stopScreenAutoRefresh();
    this.screenRefreshTimer = setInterval(() => {
      if (this.isOpen() && this.autoRefresh()) {
        if (this.activeTab() === 'MOBILE_MIRROR') {
          this.refreshMobileScreen();
        } else if (this.activeTab() === 'LAPTOP_MIRROR') {
          this.refreshDesktopScreen();
        }
      }
    }, 2200);
  }

  private stopScreenAutoRefresh(): void {
    if (this.screenRefreshTimer) {
      clearInterval(this.screenRefreshTimer);
      this.screenRefreshTimer = null;
    }
  }

  refreshMobileScreen(): void {
    this.mobileScreenUrl.set(`${getApiUrl('/api/v1/devices/mobile/screenshot')}?t=${Date.now()}`);
  }

  refreshDesktopScreen(): void {
    this.desktopScreenUrl.set(`${getApiUrl('/api/v1/devices/desktop/screenshot')}?t=${Date.now()}`);
  }

  async refreshAllData(): Promise<void> {
    await Promise.all([
      this.refreshStatus(),
      this.fetchImei(),
      this.fetchBluetoothDevices()
    ]);
  }

  async refreshStatus(): Promise<void> {
    try {
      const res = await fetch(getApiUrl('/api/v1/devices/mobile/status'));
      if (res.ok) {
        const json = await res.json();
        this.mobileStatus.set(json.data);
      }
    } catch {}
  }

  async fetchImei(): Promise<void> {
    try {
      const res = await fetch(getApiUrl('/api/v1/devices/mobile/imei'));
      if (res.ok) {
        const json = await res.json();
        this.imeiInfo.set(json);
      }
    } catch {}
  }

  async fetchBluetoothDevices(): Promise<void> {
    try {
      const res = await fetch(getApiUrl('/api/v1/devices/bluetooth/devices'));
      if (res.ok) {
        const json = await res.json();
        this.bluetoothDevices.set(json.devices || []);
      }
    } catch {}
  }

  // Direct Touch & Swipe Gestures on Mobile Screen
  onScreenPointerDown(event: PointerEvent): void {
    const target = event.currentTarget as HTMLElement;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    this.pointerDownX = event.clientX - rect.left;
    this.pointerDownY = event.clientY - rect.top;
    this.pointerDownTime = Date.now();
    this.touchRipple.set({ x: this.pointerDownX, y: this.pointerDownY, active: true });
  }

  async onScreenPointerUp(event: PointerEvent): Promise<void> {
    const target = event.currentTarget as HTMLElement;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const upX = event.clientX - rect.left;
    const upY = event.clientY - rect.top;
    const dx = upX - this.pointerDownX;
    const dy = upY - this.pointerDownY;
    const dist = Math.hypot(dx, dy);
    const duration = Math.max(100, Date.now() - this.pointerDownTime);

    const w = rect.width;
    const h = rect.height;

    if (dist < 15) {
      // Tap Gesture
      const xPct = Math.max(0.0, Math.min(1.0, upX / w));
      const yPct = Math.max(0.0, Math.min(1.0, upY / h));
      this.touchRipple.set({ x: upX, y: upY, active: true, label: 'TAP' });
      this.showFeedback(`Tapped screen at (${Math.round(xPct * 100)}%, ${Math.round(yPct * 100)}%)`);

      try {
        await fetch(getApiUrl('/api/v1/devices/mobile/tap-normalized'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ x_pct: xPct, y_pct: yPct })
        });
        setTimeout(() => this.refreshMobileScreen(), 350);
      } catch {}
    } else {
      // Swipe / Drag Gesture
      const x1Pct = Math.max(0.0, Math.min(1.0, this.pointerDownX / w));
      const y1Pct = Math.max(0.0, Math.min(1.0, this.pointerDownY / h));
      const x2Pct = Math.max(0.0, Math.min(1.0, upX / w));
      const y2Pct = Math.max(0.0, Math.min(1.0, upY / h));

      let dir = 'Swipe';
      if (Math.abs(dy) > Math.abs(dx)) {
        dir = dy < 0 ? 'Swipe Up' : 'Swipe Down';
      } else {
        dir = dx < 0 ? 'Swipe Left' : 'Swipe Right';
      }

      this.touchRipple.set({ x: upX, y: upY, active: true, label: dir.toUpperCase() });
      this.showFeedback(`${dir} across phone screen`);

      try {
        await fetch(getApiUrl('/api/v1/devices/mobile/swipe-normalized'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            x1_pct: x1Pct,
            y1_pct: y1Pct,
            x2_pct: x2Pct,
            y2_pct: y2Pct,
            duration_ms: Math.min(600, duration)
          })
        });
        setTimeout(() => this.refreshMobileScreen(), 450);
      } catch {}
    }

    setTimeout(() => this.touchRipple.set({ x: 0, y: 0, active: false }), 450);
  }

  // Backward compatibility alias for template
  handleScreenClick(event: MouseEvent): void {
    // Handled by onScreenPointerUp
  }

  // Mobile Hardware Navigation Keys
  async sendKeyEvent(key: string): Promise<void> {
    this.showFeedback(`Key: ${key.toUpperCase()}`);
    try {
      await fetch(getApiUrl('/api/v1/devices/mobile/action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'key', params: { key } })
      });
      setTimeout(() => this.refreshMobileScreen(), 400);
    } catch {}
  }

  // Launch App on Mobile
  async launchApp(app: string): Promise<void> {
    this.showFeedback(`Launching ${app.toUpperCase()}...`);
    try {
      await fetch(getApiUrl('/api/v1/devices/mobile/action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'launch_app', params: { app } })
      });
      this.speechVoice.speak(`Launching ${app} on your mobile, Sir.`);
      setTimeout(() => this.refreshMobileScreen(), 800);
    } catch {}
  }

  // Send Text Input to Mobile Keyboard
  async sendTextToMobile(): Promise<void> {
    const text = this.quickTextInput().trim();
    if (!text) return;
    this.showFeedback(`Typing "${text}" on mobile...`);
    try {
      await fetch(getApiUrl('/api/v1/devices/mobile/action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'type', params: { text } })
      });
      this.quickTextInput.set('');
      setTimeout(() => this.refreshMobileScreen(), 500);
    } catch {}
  }

  // Open Android Settings Screen
  async openSettingsScreen(screen: string): Promise<void> {
    this.showFeedback(`Opening ${screen.toUpperCase()} Settings...`);
    try {
      await fetch(getApiUrl('/api/v1/devices/mobile/settings/screen'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screen })
      });
      this.speechVoice.speak(`Opening ${screen} settings on mobile, Sir.`);
      setTimeout(() => this.refreshMobileScreen(), 600);
    } catch {}
  }

  // Update Brightness
  async updateBrightness(val: number): Promise<void> {
    this.screenBrightness.set(val);
    try {
      await fetch(getApiUrl('/api/v1/devices/mobile/settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namespace: 'system', key: 'screen_brightness', value: val.toString() })
      });
    } catch {}
  }

  // Update Volume
  async updateVolume(val: number): Promise<void> {
    this.musicVolume.set(val);
    try {
      await fetch(getApiUrl('/api/v1/devices/mobile/settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namespace: 'system', key: 'volume_music_speaker', value: val.toString() })
      });
    } catch {}
  }

  // Connect Wireless ADB
  async connectWifi(): Promise<void> {
    this.isConnectingWifi.set(true);
    this.showFeedback(`Connecting to ${this.wifiIp}:${this.wifiPort}...`);
    try {
      const res = await fetch(getApiUrl('/api/v1/devices/mobile/connect'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: this.wifiIp, port: Number(this.wifiPort) })
      });
      const data = await res.json();
      if (data.success) {
        this.speechVoice.speak('Mobile connected wirelessly, Sir.');
        this.showFeedback('Wireless ADB Connected!');
      } else {
        this.showFeedback(`Failed: ${data.message || 'Check IP'}`);
      }
      this.refreshStatus();
    } catch {
      this.showFeedback('Connection timeout.');
    } finally {
      this.isConnectingWifi.set(false);
    }
  }

  // Remote Execute command on laptop from mobile view
  async executeLaptopCommand(): Promise<void> {
    const cmd = this.remoteLaptopCommand().trim();
    if (!cmd) return;
    this.showFeedback(`Sending command to laptop: "${cmd}"...`);
    try {
      const res = await fetch(getApiUrl('/api/v1/devices/mobile-bridge/execute'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd })
      });
      const data = await res.json();
      this.remoteLaptopCommand.set('');
      this.showFeedback(data.response_message || 'Command executed on laptop.');
      setTimeout(() => this.refreshDesktopScreen(), 800);
    } catch {
      this.showFeedback('Laptop bridge error.');
    }
  }

  private feedbackTimer: any = null;
  private showFeedback(msg: string): void {
    this.lastActionFeedback.set(msg);
    if (this.feedbackTimer) clearTimeout(this.feedbackTimer);
    this.feedbackTimer = setTimeout(() => this.lastActionFeedback.set(null), 3500);
  }
}

