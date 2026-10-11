import { Component, inject, OnInit, OnDestroy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { OperatorStateService } from '../../../../core/services/operator-state.service';
import { AgentCommandService } from '../../../../core/services/agent-command.service';
import { ThreeSceneManagerService } from '../../../../shared/3d/three-scene-manager.service';
import { ThemeService, AbhiThemeColors } from '../../../../core/services/theme.service';
import { NeuralNetworkViewerComponent } from '../../../../shared/components/neural-network-viewer/neural-network-viewer.component';

export interface SpatialNodeData {
  id: string;
  name: string;
  role: string;
  status: 'ACTIVE' | 'IDLE' | 'WORKING' | 'VERIFIED';
  capabilities: string[];
  riskTier: string;
}

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NeuralNetworkViewerComponent],
  template: `
    <div class="main-agent-spatial-container" role="region" aria-label="Main Agent Workspace">
      <!-- 0. Tactical Sci-Fi Corner Calibration Brackets -->
      <div class="hud-corner-bracket top-left" aria-hidden="true">
        <div class="corner-crosshair"></div>
        <div class="corner-readout">SYS.CALIB: 0.9998 // QUANTUM CORE</div>
      </div>
      <div class="hud-corner-bracket top-right" aria-hidden="true">
        <div class="corner-crosshair"></div>
        <div class="corner-readout">SAFETY.GATE: ACTIVE // STRICT</div>
      </div>
      <div class="hud-corner-bracket bottom-left" aria-hidden="true">
        <div class="corner-crosshair"></div>
        <div class="corner-readout">WAL.SYNC: STABLE // VRAM 4.2GB</div>
      </div>
      <div class="hud-corner-bracket bottom-right" aria-hidden="true">
        <div class="corner-crosshair"></div>
        <div class="corner-readout">SPATIAL.FPS: 60 // 18ms</div>
      </div>

      <!-- 1. Top Identity & Utilities Header (Dark Neumorphic HUD) -->
      <header class="main-agent-hud-header" role="banner" aria-label="System Identity and Status">
        <!-- Brand & Identity Pill -->
        <div class="hud-brand-pill">
          <div class="brand-orb-icon">
            <span class="orb-core-dot"></span>
          </div>
          <div class="brand-text-block">
            <span class="brand-title">ABHI</span>
            <span class="brand-sub">CENTRAL INTELLIGENCE</span>
          </div>
          <div class="status-indicator-tag" [class.working]="isWorking()">
            <span class="pulse-dot"></span>
            <span class="status-label">{{ systemStatusLabel() }}</span>
          </div>
        </div>

        <!-- Center System Readiness Badges -->
        <div class="hud-center-telemetry">
          <div class="telemetry-badge" title="Dual-State Physical Verification Engine">
            <span class="badge-icon">🛡️</span>
            <span class="badge-text">DUAL-STATE VERIFIED</span>
          </div>
          <div class="telemetry-badge" title="Active Theme Palette">
            <span class="badge-icon">🎨</span>
            <span class="badge-text">{{ themeService.activeTheme().label }}</span>
          </div>
        </div>

        <!-- Right Utilities: Neural Inspector, Theme Customizer, Emergency Stop & Workspace Switcher -->
        <div class="hud-utilities-block">
          <!-- Neural Network Core Inspector Toggle Button -->
          <button
            type="button"
            class="hud-tool-btn neural-btn"
            (click)="toggleNeuralInspector()"
            [attr.aria-expanded]="showNeuralInspector()"
            title="Inspect Live Neural Network Attention & Activations"
          >
            <span class="btn-icon">🧠</span>
            <span class="btn-text">Neural Core</span>
          </button>

          <!-- Theme Customizer Toggle Button -->
          <button
            type="button"
            class="hud-tool-btn theme-btn"
            (click)="toggleThemeCustomizer()"
            [attr.aria-expanded]="showThemeCustomizer()"
            title="Switch Themes & Customize Colors"
          >
            <span class="btn-icon">🎨</span>
            <span class="btn-text">Theme</span>
          </button>

          <!-- Emergency Stop Button -->
          <button
            type="button"
            class="e-stop-btn"
            [class.active-stop]="stateService.safety().emergencyStopped"
            (click)="triggerEmergencyStop()"
            title="Emergency Stop All Automation & Inference"
          >
            <span class="stop-icon">🛑</span>
            <span class="stop-text">E-STOP</span>
          </button>

          <!-- Contextual Workspace Switcher Dropdown Button -->
          <div class="workspace-switcher-wrap">
            <button
              type="button"
              class="switcher-toggle-btn"
              (click)="toggleWorkspaceMenu()"
              [attr.aria-expanded]="showWorkspaceMenu()"
              title="Navigate Workspaces"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="7" height="7" x="3" y="3" rx="1"/>
                <rect width="7" height="7" x="14" y="3" rx="1"/>
                <rect width="7" height="7" x="14" y="14" rx="1"/>
                <rect width="7" height="7" x="3" y="14" rx="1"/>
              </svg>
              <span class="switcher-text">Workspaces</span>
              <span class="caret" [class.open]="showWorkspaceMenu()">▾</span>
            </button>

            @if (showWorkspaceMenu()) {
              <div class="workspace-dropdown-menu" (mouseleave)="showWorkspaceMenu.set(false)">
                <div class="dropdown-header">OPERATING WORKSPACES</div>
                @for (ws of workspaceRoutes; track ws.route) {
                  <button
                    type="button"
                    class="ws-menu-item"
                    (click)="navigateTo(ws.route)"
                  >
                    <span class="ws-item-icon">
                      @if (ws.id === 'network') {
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><circle cx="19" cy="6" r="2"/><circle cx="5" cy="6" r="2"/><circle cx="5" cy="18" r="2"/></svg>
                      } @else if (ws.id === 'intelligence') {
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      } @else if (ws.id === 'business') {
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                      } @else if (ws.id === 'media') {
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/></svg>
                      } @else {
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m10 15 5-3-5-3v6Z"/></svg>
                      }
                    </span>
                    <div class="ws-item-text">
                      <span class="ws-item-title">{{ ws.title }}</span>
                      <span class="ws-item-desc">{{ ws.desc }}</span>
                    </div>
                    <span class="ws-item-badge">{{ ws.badge }}</span>
                  </button>
                }
              </div>
            }
          </div>
        </div>
      </header>

      <!-- 2. Subconscious Cognitive Stream Bar (Live AI Thought Ticker) -->
      <section class="subconscious-thought-bar" aria-label="Subconscious Cognitive Stream">
        <div class="thought-pulse-indicator">
          <span class="beacon-ring"></span>
          <span class="beacon-core"></span>
        </div>
        <div class="thought-content-wrapper">
          <span class="thought-prefix">COGNITIVE STREAM //</span>
          <span class="thought-stream-text">{{ activeSubconsciousThought() }}</span>
        </div>
        <div class="thought-quantum-tag">
          <span class="quantum-label">OLLAMA LOCAL · WAL SYNCED</span>
        </div>
      </section>

      <!-- 3. Left Flank: Holographic Telemetry HUD (With Minimize/Expand Controls) -->
      @if (showTelemetry()) {
        <aside class="holographic-telemetry-panel" aria-label="Neural Telemetry">
          <div class="flank-panel-header">
            <span class="flank-panel-icon">⚡</span>
            <span class="flank-panel-title">NPU TELEMETRY</span>
            <button
              type="button"
              class="flank-toggle-btn"
              (click)="showTelemetry.set(false)"
              title="Minimize Telemetry Panel"
            >
              ◂
            </button>
          </div>
          <div class="flank-metrics-list">
            <div class="metric-row">
              <div class="metric-info">
                <span class="metric-label">Core Compute</span>
                <span class="metric-value">78%</span>
              </div>
              <div class="metric-sparkline-wrap">
                <svg viewBox="0 0 100 24" class="sparkline-svg">
                  <path d="M 0 18 Q 15 6 30 14 T 60 8 T 85 16 L 100 6" fill="none" stroke="currentColor" stroke-width="2" class="sparkline-path" />
                </svg>
              </div>
            </div>

            <div class="metric-row">
              <div class="metric-info">
                <span class="metric-label">VRAM Allocation</span>
                <span class="metric-value">4.2 / 16.0 GB</span>
              </div>
              <div class="metric-progress-track">
                <div class="metric-progress-bar" style="width: 26.2%;"></div>
              </div>
            </div>

            <div class="metric-row-inline">
              <div class="inline-badge">
                <span class="badge-dot green"></span>
                <span class="inline-label">Latency:</span>
                <span class="inline-val">18 ms</span>
              </div>
              <div class="inline-badge">
                <span class="badge-dot cyan"></span>
                <span class="inline-label">Verify:</span>
                <span class="inline-val">99.8%</span>
              </div>
            </div>
          </div>
        </aside>
      } @else {
        <!-- Minimized Floating Telemetry Trigger Badge -->
        <button
          type="button"
          class="flank-min-trigger left"
          (click)="showTelemetry.set(true)"
          title="Expand Neural Telemetry Monitor"
        >
          <span class="trigger-icon">⚡</span>
          <span class="trigger-label">Telemetry</span>
        </button>
      }

      <!-- 4. Right Flank: Specialist Agent Swarm Beacons (With Minimize/Expand Controls) -->
      @if (showSwarm()) {
        <aside class="holographic-swarm-panel" aria-label="Specialist Swarm Nodes">
          <div class="flank-panel-header">
            <span class="flank-panel-icon">🌐</span>
            <span class="flank-panel-title">SWARM SATELLITES</span>
            <span class="swarm-count-badge">8 NODES</span>
            <button
              type="button"
              class="flank-toggle-btn"
              (click)="showSwarm.set(false)"
              title="Minimize Swarm Panel"
            >
              ▸
            </button>
          </div>
          <div class="swarm-node-list">
            @for (agent of specialistAgents; track agent.id) {
              <button
                type="button"
                class="swarm-node-item"
                [class.selected]="selectedNode()?.id === agent.id"
                (click)="selectSpecialistAgent(agent)"
                [title]="agent.role"
              >
                <div class="agent-beacon-dot"></div>
                <div class="agent-beacon-meta">
                  <span class="agent-beacon-name">{{ agent.name }}</span>
                  <span class="agent-beacon-status">{{ agent.status }}</span>
                </div>
                <span class="agent-beacon-tier">{{ agent.riskTier }}</span>
              </button>
            }
          </div>
        </aside>
      } @else {
        <!-- Minimized Floating Swarm Trigger Badge -->
        <button
          type="button"
          class="flank-min-trigger right"
          (click)="showSwarm.set(true)"
          title="Expand Specialist Swarm Nodes"
        >
          <span class="trigger-icon">🌐</span>
          <span class="trigger-label">Swarm (8)</span>
        </button>
      }

      <!-- 5. Interactive Theme Customizer Modal / Popover -->
      @if (showThemeCustomizer()) {
        <aside class="theme-customizer-panel" role="dialog" aria-label="Theme Customizer">
          <div class="customizer-header">
            <div class="customizer-title-group">
              <span class="title-icon">🎨</span>
              <span class="title-text">Theme & Color Customizer</span>
            </div>
            <button type="button" class="close-customizer-btn" (click)="closeThemeCustomizer()">✕</button>
          </div>

          <div class="customizer-body">
            <!-- Preset Selection -->
            <div class="preset-section">
              <label class="section-label">THEME PRESETS</label>
              <div class="presets-row">
                @for (preset of themeService.availablePresets; track preset.id) {
                  <button
                    type="button"
                    class="preset-pill"
                    [class.active]="themeService.activeTheme().id === preset.id"
                    (click)="selectPreset(preset.id)"
                  >
                    <span class="preset-color-dot" [style.background]="preset.colors.accentPrimary"></span>
                    <span>{{ preset.label }}</span>
                  </button>
                }
              </div>
            </div>

            <!-- Custom Color Palette Controls -->
            <div class="palette-section">
              <label class="section-label">CUSTOM PALETTE OVERRIDES</label>
              <div class="color-pickers-grid">
                <div class="color-picker-item">
                  <span class="picker-label">Accent Primary</span>
                  <div class="picker-control">
                    <input
                      type="color"
                      [value]="themeService.activeTheme().colors.accentPrimary"
                      (input)="onColorChange('accentPrimary', $event)"
                    />
                    <span class="color-hex">{{ themeService.activeTheme().colors.accentPrimary }}</span>
                  </div>
                </div>

                <div class="color-picker-item">
                  <span class="picker-label">Accent Secondary</span>
                  <div class="picker-control">
                    <input
                      type="color"
                      [value]="themeService.activeTheme().colors.accentSecondary"
                      (input)="onColorChange('accentSecondary', $event)"
                    />
                    <span class="color-hex">{{ themeService.activeTheme().colors.accentSecondary }}</span>
                  </div>
                </div>

                <div class="color-picker-item">
                  <span class="picker-label">3D Core Glow</span>
                  <div class="picker-control">
                    <input
                      type="color"
                      [value]="themeService.activeTheme().colors.coreGlow"
                      (input)="onColorChange('coreGlow', $event)"
                    />
                    <span class="color-hex">{{ themeService.activeTheme().colors.coreGlow }}</span>
                  </div>
                </div>

                <div class="color-picker-item">
                  <span class="picker-label">Network Synapses</span>
                  <div class="picker-control">
                    <input
                      type="color"
                      [value]="themeService.activeTheme().colors.networkLine"
                      (input)="onColorChange('networkLine', $event)"
                    />
                    <span class="color-hex">{{ themeService.activeTheme().colors.networkLine }}</span>
                  </div>
                </div>

                <div class="color-picker-item">
                  <span class="picker-label">Background Base</span>
                  <div class="picker-control">
                    <input
                      type="color"
                      [value]="themeService.activeTheme().colors.background"
                      (input)="onColorChange('background', $event)"
                    />
                    <span class="color-hex">{{ themeService.activeTheme().colors.background }}</span>
                  </div>
                </div>

                <div class="color-picker-item">
                  <span class="picker-label">Raised Surface</span>
                  <div class="picker-control">
                    <input
                      type="color"
                      [value]="themeService.activeTheme().colors.surfaceRaised"
                      (input)="onColorChange('surfaceRaised', $event)"
                    />
                    <span class="color-hex">{{ themeService.activeTheme().colors.surfaceRaised }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Action Buttons: Save, Cancel, Reset -->
            <div class="customizer-actions-row">
              <button type="button" class="action-btn reset-btn" (click)="resetTheme()">
                Reset Default
              </button>
              @if (themeService.previewTheme()) {
                <button type="button" class="action-btn cancel-btn" (click)="cancelThemePreview()">
                  Cancel
                </button>
                <button type="button" class="action-btn save-btn" (click)="saveTheme()">
                  Save Palette
                </button>
              }
            </div>
          </div>
        </aside>
      }

      <!-- 6. Spatial Node Detail Inspector (Contextual Card with Highest Z-Index) -->
      @if (selectedNode()) {
        <aside class="spatial-node-inspector" role="complementary" aria-label="Agent Node Details">
          <div class="inspector-header">
            <div class="node-title-group">
              <span class="node-type-dot"></span>
              <span class="node-name">{{ selectedNode()?.name }}</span>
            </div>
            <button type="button" class="close-inspector-btn" (click)="selectedNode.set(null)" aria-label="Close Inspector">✕</button>
          </div>
          <div class="inspector-body">
            <div class="inspector-field">
              <span class="field-label">Role:</span>
              <span class="field-val">{{ selectedNode()?.role }}</span>
            </div>
            <div class="inspector-field">
              <span class="field-label">Risk Tier:</span>
              <span class="field-val badge-tier">{{ selectedNode()?.riskTier }}</span>
            </div>
            <div class="inspector-field">
              <span class="field-label">Capabilities:</span>
              <div class="caps-tags-wrap">
                @for (cap of selectedNode()?.capabilities; track cap) {
                  <span class="cap-tag">{{ cap }}</span>
                }
              </div>
            </div>
          </div>
        </aside>
      }

      <!-- 7. Contextual Current Task Status Floating Overlay -->
      @if (activeTaskStatus()) {
        <section class="contextual-task-overlay" [class.task-failed]="activeTaskStatus()?.stage === 'FAILED'" [class.task-success]="activeTaskStatus()?.stage === 'COMPLETED'">
          <div class="task-status-pill">
            <div class="stage-indicator-orb" [attr.data-stage]="activeTaskStatus()?.stage">
              @if (activeTaskStatus()?.stage === 'EXECUTING' || activeTaskStatus()?.stage === 'PLANNING') {
                <span class="spinner-dot"></span>
              } @else if (activeTaskStatus()?.stage === 'COMPLETED') {
                <span class="check-mark">✓</span>
              } @else if (activeTaskStatus()?.stage === 'FAILED') {
                <span class="error-mark">✕</span>
              } @else {
                <span class="info-mark">⚡</span>
              }
            </div>

            <div class="task-info-block">
              <div class="task-primary-line">
                <span class="task-stage-badge">{{ activeTaskStatus()?.stage }}</span>
                <span class="task-goal-text">{{ activeTaskStatus()?.command }}</span>
              </div>
              @if (activeTaskStatus()?.message) {
                <div class="task-message-line">{{ activeTaskStatus()?.message }}</div>
              }
            </div>

            <!-- Dismiss / Details Toggle -->
            <div class="task-actions-group">
              @if (activeTaskStatus()?.stage === 'EXECUTING') {
                <button type="button" class="task-cancel-btn" (click)="cancelTask()" title="Cancel Execution">
                  Cancel
                </button>
              }
              <button type="button" class="task-dismiss-btn" (click)="dismissTaskOverlay()" title="Dismiss">
                ✕
              </button>
            </div>
          </div>
        </section>
      }

      <!-- 8. Holographic Voice Spectral Waveform & Spatial Quick Action Matrix -->
      <section class="dock-floating-auxiliary" aria-label="Agent Audio and Quick Controls">
        <!-- 16-Band Spectral Equalizer Waveform -->
        <div class="voice-spectral-analyzer" [class.active]="isListening() || isWorking()" title="Neural Audio & Energy Resonance">
          @for (bar of spectralBars; track bar) {
            <span class="spectrum-bar" [style.--bar-index]="bar"></span>
          }
        </div>

        <!-- Spatial Quick-Action Hologram Matrix -->
        <div class="spatial-quick-matrix" role="toolbar" aria-label="Spatial Quick Actions">
          <button type="button" class="quick-chip-btn" (click)="executeQuickAction('vision')" title="Instant Desktop Vision Perception Scan">
            <span class="chip-icon">⚡</span>
            <span>Desktop Scan</span>
          </button>
          <button type="button" class="quick-chip-btn" (click)="executeQuickAction('neural')" title="Open Neural Network Core Inspector">
            <span class="chip-icon">🧠</span>
            <span>Neural Weights</span>
          </button>
          <button type="button" class="quick-chip-btn" (click)="executeQuickAction('network')" title="View 3D Specialist Swarm Topology">
            <span class="chip-icon">🌐</span>
            <span>Swarm Topology</span>
          </button>
          <button type="button" class="quick-chip-btn" (click)="executeQuickAction('verify')" title="Verify Physical Operating State">
            <span class="chip-icon">🛡️</span>
            <span>Verify State</span>
          </button>
          <button type="button" class="quick-chip-btn" (click)="executeQuickAction('lab')" title="Autonomous Intelligence Lab">
            <span class="chip-icon">📊</span>
            <span>Model Lab</span>
          </button>
        </div>
      </section>

      <!-- 9. Floating Neumorphic Command Dock (Centered Bottom Interface) -->
      <footer class="neumorphic-dock-container" role="region" aria-label="Command Dock">
        <div class="neumorphic-dock-shell" [class.working]="isWorking()" [class.has-error]="errorMessage()">
          <form class="dock-form" (ngSubmit)="onSubmitCommand()">
            <div class="dock-input-wrapper">
              <!-- AI Core Symbol -->
              <div class="dock-ai-icon" [class.glow]="isWorking()">
                @if (isWorking()) {
                  <span class="dock-spin">🌀</span>
                } @else {
                  <span class="dock-sparkle">✦</span>
                }
              </div>

              <!-- Main Inset Command Input -->
              <input
                type="text"
                class="dock-input-field"
                [(ngModel)]="commandInput"
                name="userCommand"
                [placeholder]="inputPlaceholder"
                autocomplete="off"
                [disabled]="isWorking()"
                (keydown.escape)="clearCommand()"
                aria-label="Command Input"
              />

              <!-- Controls: Voice Toggle & Submit -->
              <div class="dock-controls-group">
                <!-- Voice Toggle Button -->
                <button
                  type="button"
                  class="dock-control-btn voice-btn"
                  [class.listening]="isListening()"
                  (click)="toggleVoiceInput()"
                  title="Voice Input (Speech-to-Text)"
                  aria-label="Toggle Voice Input"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="22"/>
                  </svg>
                </button>

                <!-- Submit Action Button -->
                <button
                  type="submit"
                  class="dock-control-btn submit-btn"
                  [disabled]="!commandInput.trim() || isWorking()"
                  title="Execute Command (Enter)"
                  aria-label="Submit Command"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </div>
          </form>

          <!-- Error Alert Banner in Dock if Submission Fails -->
          @if (errorMessage()) {
            <div class="dock-error-banner" role="alert">
              <span class="error-icon">⚠️</span>
              <span class="error-text">{{ errorMessage() }}</span>
              <button type="button" class="error-close" (click)="errorMessage.set(null)">✕</button>
            </div>
          }
        </div>
      </footer>

      <!-- 10. Neural Network Inspector Modal Overlay -->
      @if (showNeuralInspector()) {
        <div class="neural-modal-backdrop" (click)="showNeuralInspector.set(false)"></div>
        <app-neural-network-viewer
          [isModal]="true"
          (closeViewer)="showNeuralInspector.set(false)"
        ></app-neural-network-viewer>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      position: relative;
    }

    .main-agent-spatial-container {
      position: relative;
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 14px 20px;
      box-sizing: border-box;
      pointer-events: none;
    }

    /* 0. Sci-Fi Tactical Corner Calibration Brackets */
    .hud-corner-bracket {
      position: absolute;
      width: 110px;
      height: 42px;
      pointer-events: none;
      z-index: 10;
      opacity: 0.7;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      color: var(--abhi-cyan, #0099cc);
      font-size: 8px;
      letter-spacing: 0.1em;
      transition: opacity var(--abhi-transition-normal, 280ms);
    }

    .hud-corner-bracket.top-left {
      top: 12px;
      left: 14px;
      border-top: 1.5px solid var(--abhi-cyan, #0099cc);
      border-left: 1.5px solid var(--abhi-cyan, #0099cc);
      padding: 5px 0 0 6px;
    }

    .hud-corner-bracket.top-right {
      top: 12px;
      right: 14px;
      border-top: 1.5px solid var(--abhi-cyan, #0099cc);
      border-right: 1.5px solid var(--abhi-cyan, #0099cc);
      padding: 5px 6px 0 0;
      text-align: right;
    }

    .hud-corner-bracket.bottom-left {
      bottom: 12px;
      left: 14px;
      border-bottom: 1.5px solid var(--abhi-cyan, #0099cc);
      border-left: 1.5px solid var(--abhi-cyan, #0099cc);
      padding: 0 0 5px 6px;
      display: flex;
      align-items: flex-end;
    }

    .hud-corner-bracket.bottom-right {
      bottom: 12px;
      right: 14px;
      border-bottom: 1.5px solid var(--abhi-cyan, #0099cc);
      border-right: 1.5px solid var(--abhi-cyan, #0099cc);
      padding: 0 6px 5px 0;
      display: flex;
      align-items: flex-end;
      justify-content: flex-end;
      text-align: right;
    }

    .corner-crosshair {
      position: absolute;
      width: 4px;
      height: 4px;
      background: var(--abhi-cyan, #0099cc);
      box-shadow: 0 0 6px var(--abhi-cyan, #0099cc);
    }

    .hud-corner-bracket.top-left .corner-crosshair { top: 0; left: 0; }
    .hud-corner-bracket.top-right .corner-crosshair { top: 0; right: 0; }
    .hud-corner-bracket.bottom-left .corner-crosshair { bottom: 0; left: 0; }
    .hud-corner-bracket.bottom-right .corner-crosshair { bottom: 0; right: 0; }

    /* 1. Top HUD Header */
    .main-agent-hud-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      z-index: 50;
      pointer-events: auto;
      gap: 12px;
    }

    .hud-brand-pill {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 7px 14px;
      background: var(--abhi-surface-raised, #ffffff);
      border: 1px solid var(--abhi-border, rgba(0, 153, 204, 0.2));
      border-radius: var(--abhi-radius-control, 18px);
      box-shadow: var(--abhi-raised-shadow, 6px 6px 18px rgba(0, 0, 0, 0.08));
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      flex-shrink: 0;
    }

    .brand-orb-icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: radial-gradient(circle, var(--abhi-cyan, #0099cc) 0%, var(--abhi-blue, #0284c7) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 10px rgba(0, 153, 204, 0.5);
    }

    .orb-core-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ffffff;
    }

    .brand-text-block {
      display: flex;
      flex-direction: column;
    }

    .brand-title {
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: var(--abhi-text-primary, #0f172a);
      line-height: 1.1;
    }

    .brand-sub {
      font-size: 8.5px;
      font-weight: 600;
      letter-spacing: 0.12em;
      color: var(--abhi-cyan, #0099cc);
    }

    .status-indicator-tag {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border-radius: 12px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.25);
    }

    .status-indicator-tag.working {
      background: rgba(0, 153, 204, 0.12);
      border-color: rgba(0, 153, 204, 0.35);
    }

    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--abhi-success, #10b981);
      box-shadow: 0 0 6px var(--abhi-success, #10b981);
    }

    .status-indicator-tag.working .pulse-dot {
      background: var(--abhi-cyan, #0099cc);
      box-shadow: 0 0 6px var(--abhi-cyan, #0099cc);
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.4); opacity: 0.6; }
    }

    .status-label {
      font-size: 10px;
      font-family: monospace;
      font-weight: 600;
      color: var(--abhi-text-primary, #0f172a);
    }

    /* Center Telemetry Badges */
    .hud-center-telemetry {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .telemetry-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: var(--abhi-surface-inset, #f1f5f9);
      border: 1px solid var(--abhi-border, rgba(0, 153, 204, 0.16));
      border-radius: 14px;
      box-shadow: var(--abhi-inset-shadow, inset 3px 3px 7px rgba(0,0,0,0.06));
      font-size: 11px;
      font-family: monospace;
      color: var(--abhi-text-secondary, #475569);
      white-space: nowrap;
    }

    .badge-icon {
      font-size: 12px;
    }

    .badge-text {
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    /* Right Utilities */
    .hud-utilities-block {
      display: flex;
      align-items: center;
      gap: 8px;
      position: relative;
      flex-shrink: 0;
    }

    .hud-tool-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      background: var(--abhi-surface-raised, #ffffff);
      border: 1px solid var(--abhi-border, rgba(0, 153, 204, 0.2));
      border-radius: var(--abhi-radius-control, 18px);
      box-shadow: var(--abhi-raised-shadow, 6px 6px 18px rgba(0, 0, 0, 0.08));
      color: var(--abhi-text-primary, #0f172a);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--abhi-transition-fast, 160ms);
      white-space: nowrap;
    }

    .hud-tool-btn:hover {
      border-color: var(--abhi-cyan, #0099cc);
      color: var(--abhi-cyan, #0099cc);
      box-shadow: 0 0 14px var(--abhi-glow-primary, rgba(0, 153, 204, 0.3));
    }

    .hud-tool-btn.neural-btn {
      border-color: rgba(0, 153, 204, 0.4);
      color: var(--abhi-cyan, #0099cc);
    }

    .neural-modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(5, 8, 17, 0.65);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 999;
    }

    .btn-icon {
      font-size: 13px;
    }

    .e-stop-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      background: var(--abhi-surface-raised, #ffffff);
      border: 1px solid rgba(239, 68, 68, 0.35);
      border-radius: var(--abhi-radius-control, 18px);
      box-shadow: var(--abhi-raised-shadow, 6px 6px 18px rgba(0, 0, 0, 0.08));
      color: var(--abhi-danger, #ef4444);
      font-weight: 700;
      font-size: 11px;
      cursor: pointer;
      transition: all var(--abhi-transition-fast, 160ms);
      white-space: nowrap;
    }

    .e-stop-btn:hover {
      background: rgba(239, 68, 68, 0.12);
      border-color: var(--abhi-danger, #ef4444);
      box-shadow: 0 0 14px rgba(239, 68, 68, 0.4);
    }

    .e-stop-btn.active-stop {
      background: var(--abhi-danger, #ef4444);
      color: #ffffff;
      box-shadow: 0 0 20px rgba(239, 68, 68, 0.8);
    }

    .workspace-switcher-wrap {
      position: relative;
    }

    .switcher-toggle-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 12px;
      background: var(--abhi-surface-raised, #ffffff);
      border: 1px solid var(--abhi-border, rgba(0, 153, 204, 0.2));
      border-radius: var(--abhi-radius-control, 18px);
      box-shadow: var(--abhi-raised-shadow, 6px 6px 18px rgba(0, 0, 0, 0.08));
      color: var(--abhi-text-primary, #0f172a);
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--abhi-transition-fast, 160ms);
      white-space: nowrap;
    }

    .switcher-toggle-btn:hover {
      border-color: var(--abhi-cyan, #0099cc);
      color: var(--abhi-cyan, #0099cc);
    }

    .caret {
      font-size: 10px;
      transition: transform var(--abhi-transition-fast, 160ms);
    }

    .caret.open {
      transform: rotate(180deg);
    }

    .workspace-dropdown-menu {
      position: absolute;
      top: 42px;
      right: 0;
      width: 280px;
      background: var(--abhi-surface-raised, #ffffff);
      border: 1px solid var(--abhi-border, rgba(0, 153, 204, 0.3));
      border-radius: 16px;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.18);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      z-index: 100;
      animation: menuFadeIn 0.2s ease-out;
    }

    @keyframes menuFadeIn {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .dropdown-header {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: var(--abhi-text-muted, #64748b);
      padding: 4px 8px;
    }

    .ws-menu-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 10px;
      cursor: pointer;
      text-align: left;
      transition: all var(--abhi-transition-fast, 160ms);
    }

    .ws-menu-item:hover {
      background: var(--abhi-surface-inset, #f1f5f9);
      border-color: var(--abhi-border, rgba(0, 153, 204, 0.2));
    }

    .ws-item-icon {
      color: var(--abhi-cyan, #0099cc);
      display: flex;
      align-items: center;
    }

    .ws-item-text {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .ws-item-title {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--abhi-text-primary, #0f172a);
    }

    .ws-item-desc {
      font-size: 9.5px;
      color: var(--abhi-text-muted, #64748b);
    }

    .ws-item-badge {
      font-size: 9px;
      font-family: monospace;
      padding: 2px 6px;
      background: rgba(0, 153, 204, 0.12);
      color: var(--abhi-cyan, #0099cc);
      border-radius: 6px;
    }

    /* 2. Subconscious Cognitive Stream Bar */
    .subconscious-thought-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      width: calc(100% - 32px);
      max-width: 860px;
      margin: 6px auto 0 auto;
      padding: 6px 14px;
      background: var(--abhi-surface-raised, rgba(255, 255, 255, 0.85));
      border: 1px solid var(--abhi-border, rgba(0, 153, 204, 0.2));
      border-radius: 20px;
      box-shadow: var(--abhi-raised-shadow, 4px 4px 14px rgba(0, 0, 0, 0.06));
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      pointer-events: auto;
      z-index: 45;
      animation: fadeInDown 0.4s ease-out;
      box-sizing: border-box;
    }

    @keyframes fadeInDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .thought-pulse-indicator {
      position: relative;
      width: 14px;
      height: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .beacon-core {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--abhi-cyan, #0099cc);
      box-shadow: 0 0 8px var(--abhi-cyan, #0099cc);
    }

    .beacon-ring {
      position: absolute;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 1.5px solid var(--abhi-cyan, #0099cc);
      opacity: 0.6;
      animation: beaconPulse 2s infinite cubic-bezier(0, 0.2, 0.8, 1);
    }

    @keyframes beaconPulse {
      0% { transform: scale(0.6); opacity: 1; }
      100% { transform: scale(1.6); opacity: 0; }
    }

    .thought-content-wrapper {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      overflow: hidden;
      white-space: nowrap;
      min-width: 0;
    }

    .thought-prefix {
      font-size: 10px;
      font-family: monospace;
      font-weight: 700;
      color: var(--abhi-cyan, #0099cc);
      letter-spacing: 0.08em;
      flex-shrink: 0;
    }

    .thought-stream-text {
      font-size: 11.5px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      color: var(--abhi-text-primary, #0f172a);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      animation: tickerFade 0.4s ease-in-out;
    }

    @keyframes tickerFade {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .thought-quantum-tag {
      font-size: 9px;
      font-family: monospace;
      padding: 2px 8px;
      border-radius: 8px;
      background: var(--abhi-surface-inset, #f1f5f9);
      border: 1px solid var(--abhi-border, rgba(0, 153, 204, 0.15));
      color: var(--abhi-text-secondary, #475569);
      flex-shrink: 0;
      white-space: nowrap;
    }

    /* 3. Left-Flank Holographic Telemetry HUD */
    .holographic-telemetry-panel {
      position: absolute;
      top: 110px;
      left: 20px;
      width: 210px;
      background: var(--abhi-surface-raised, rgba(255, 255, 255, 0.88));
      border: 1px solid var(--abhi-border, rgba(0, 153, 204, 0.2));
      border-radius: 18px;
      box-shadow: var(--abhi-raised-shadow, 8px 8px 24px rgba(0, 0, 0, 0.08));
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      padding: 12px;
      pointer-events: auto;
      z-index: 40;
      animation: fadeInLeft 0.3s ease-out;
    }

    @keyframes fadeInLeft {
      from { opacity: 0; transform: translateX(-16px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .flank-panel-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--abhi-border, rgba(0, 153, 204, 0.15));
      margin-bottom: 8px;
    }

    .flank-panel-icon {
      font-size: 13px;
    }

    .flank-panel-title {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--abhi-text-primary, #0f172a);
    }

    .flank-toggle-btn {
      margin-left: auto;
      background: transparent;
      border: none;
      color: var(--abhi-text-muted, #64748b);
      cursor: pointer;
      font-size: 12px;
      padding: 0 4px;
      border-radius: 4px;
      transition: color 0.15s ease;
    }

    .flank-toggle-btn:hover {
      color: var(--abhi-cyan, #0099cc);
    }

    .flank-min-trigger {
      position: absolute;
      top: 110px;
      z-index: 40;
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: var(--abhi-surface-raised, rgba(255, 255, 255, 0.88));
      border: 1px solid var(--abhi-border, rgba(0, 153, 204, 0.25));
      border-radius: 16px;
      box-shadow: var(--abhi-raised-shadow, 4px 4px 14px rgba(0, 0, 0, 0.08));
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      color: var(--abhi-text-primary, #0f172a);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      animation: fadeIn 0.3s ease;
    }

    .flank-min-trigger.left {
      left: 20px;
    }

    .flank-min-trigger.right {
      right: 20px;
    }

    .flank-min-trigger:hover {
      border-color: var(--abhi-cyan, #0099cc);
      box-shadow: 0 0 12px rgba(0, 153, 204, 0.3);
      color: var(--abhi-cyan, #0099cc);
      transform: translateY(-1px);
    }

    .flank-metrics-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .metric-row {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .metric-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
    }

    .metric-label {
      color: var(--abhi-text-secondary, #475569);
      font-weight: 500;
    }

    .metric-value {
      font-family: monospace;
      font-weight: 700;
      color: var(--abhi-cyan, #0099cc);
    }

    .metric-sparkline-wrap {
      width: 100%;
      height: 18px;
      background: var(--abhi-surface-inset, #f1f5f9);
      border-radius: 6px;
      overflow: hidden;
      display: flex;
      align-items: center;
      border: 1px solid var(--abhi-border, rgba(0, 153, 204, 0.12));
    }

    .sparkline-svg {
      width: 100%;
      height: 100%;
      color: var(--abhi-cyan, #0099cc);
    }

    .sparkline-path {
      stroke-dasharray: 100;
      animation: dash 4s linear infinite;
    }

    @keyframes dash {
      to { stroke-dashoffset: -200; }
    }

    .metric-progress-track {
      width: 100%;
      height: 5px;
      background: var(--abhi-surface-inset, #f1f5f9);
      border-radius: 4px;
      overflow: hidden;
      border: 1px solid var(--abhi-border, rgba(0, 153, 204, 0.12));
    }

    .metric-progress-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--abhi-cyan, #0099cc) 0%, var(--abhi-blue, #0284c7) 100%);
      border-radius: 4px;
      box-shadow: 0 0 8px rgba(0, 153, 204, 0.5);
    }

    .metric-row-inline {
      display: flex;
      justify-content: space-between;
      gap: 4px;
      margin-top: 2px;
    }

    .inline-badge {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 9px;
      font-family: monospace;
      padding: 3px 5px;
      background: var(--abhi-surface-inset, #f1f5f9);
      border-radius: 6px;
      border: 1px solid var(--abhi-border, rgba(0, 153, 204, 0.12));
    }

    .badge-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
    }

    .badge-dot.green { background: #10b981; box-shadow: 0 0 4px #10b981; }
    .badge-dot.cyan { background: var(--abhi-cyan, #0099cc); box-shadow: 0 0 4px var(--abhi-cyan, #0099cc); }

    .inline-label { color: var(--abhi-text-muted, #64748b); }
    .inline-val { color: var(--abhi-text-primary, #0f172a); font-weight: 700; }

    /* 4. Right-Flank Holographic Specialist Agent Swarm Beacons */
    .holographic-swarm-panel {
      position: absolute;
      top: 110px;
      right: 20px;
      width: 220px;
      max-height: calc(100vh - 250px);
      background: var(--abhi-surface-raised, rgba(255, 255, 255, 0.88));
      border: 1px solid var(--abhi-border, rgba(0, 153, 204, 0.2));
      border-radius: 18px;
      box-shadow: var(--abhi-raised-shadow, 8px 8px 24px rgba(0, 0, 0, 0.08));
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      padding: 12px;
      pointer-events: auto;
      z-index: 40;
      display: flex;
      flex-direction: column;
      animation: fadeInRight 0.3s ease-out;
    }

    @keyframes fadeInRight {
      from { opacity: 0; transform: translateX(16px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .swarm-count-badge {
      font-size: 8px;
      font-family: monospace;
      padding: 2px 4px;
      border-radius: 5px;
      background: rgba(0, 153, 204, 0.12);
      color: var(--abhi-cyan, #0099cc);
      font-weight: 700;
    }

    .swarm-node-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow-y: auto;
      padding-right: 2px;
    }

    .swarm-node-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 6px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 7px;
      cursor: pointer;
      text-align: left;
      transition: all var(--abhi-transition-fast, 160ms);
    }

    .swarm-node-item:hover, .swarm-node-item.selected {
      background: var(--abhi-surface-inset, #f1f5f9);
      border-color: var(--abhi-border, rgba(0, 153, 204, 0.25));
      transform: translateX(-2px);
    }

    .agent-beacon-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--abhi-cyan, #0099cc);
      box-shadow: 0 0 6px var(--abhi-cyan, #0099cc);
      flex-shrink: 0;
    }

    .agent-beacon-meta {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .agent-beacon-name {
      font-size: 10.5px;
      font-weight: 600;
      color: var(--abhi-text-primary, #0f172a);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .agent-beacon-status {
      font-size: 8px;
      font-family: monospace;
      color: var(--abhi-text-muted, #64748b);
    }

    .agent-beacon-tier {
      font-size: 8px;
      font-family: monospace;
      padding: 1px 3px;
      border-radius: 4px;
      background: rgba(255, 202, 112, 0.15);
      color: var(--abhi-amber, #d97706);
    }

    /* 5. Theme Customizer Panel */
    .theme-customizer-panel {
      position: absolute;
      top: 68px;
      right: 20px;
      width: 310px;
      background: var(--abhi-surface-raised, #ffffff);
      border: 1px solid var(--abhi-border-active, rgba(0, 153, 204, 0.42));
      border-radius: 18px;
      box-shadow: var(--abhi-raised-shadow, 9px 9px 22px rgba(0, 0, 0, 0.18));
      padding: 16px;
      z-index: 100;
      pointer-events: auto;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      animation: menuFadeIn 0.25s ease-out;
    }

    .customizer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--abhi-border, rgba(0, 153, 204, 0.15));
      padding-bottom: 8px;
      margin-bottom: 12px;
    }

    .customizer-title-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .title-text {
      font-size: 13px;
      font-weight: 700;
      color: var(--abhi-text-primary, #0f172a);
    }

    .close-customizer-btn {
      background: none;
      border: none;
      color: var(--abhi-text-muted, #64748b);
      cursor: pointer;
      font-size: 14px;
    }

    .customizer-body {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .section-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--abhi-text-muted, #64748b);
      margin-bottom: 6px;
      display: block;
    }

    .presets-row {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .preset-pill {
      flex: 1 1 calc(50% - 4px);
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      background: var(--abhi-surface-inset, #f1f5f9);
      border: 1px solid var(--abhi-border, rgba(0, 153, 204, 0.15));
      border-radius: 10px;
      color: var(--abhi-text-primary, #0f172a);
      font-size: 10.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--abhi-transition-fast, 160ms);
    }

    .preset-pill:hover, .preset-pill.active {
      border-color: var(--abhi-cyan, #0099cc);
      box-shadow: 0 0 10px rgba(0, 153, 204, 0.25);
    }

    .preset-color-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
    }

    .color-pickers-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }

    .color-picker-item {
      display: flex;
      flex-direction: column;
      gap: 3px;
      background: var(--abhi-surface-inset, #f1f5f9);
      padding: 5px 7px;
      border-radius: 8px;
      border: 1px solid var(--abhi-border, rgba(0, 153, 204, 0.15));
    }

    .picker-label {
      font-size: 9.5px;
      color: var(--abhi-text-muted, #64748b);
    }

    .picker-control {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .picker-control input[type="color"] {
      border: none;
      width: 20px;
      height: 20px;
      border-radius: 5px;
      cursor: pointer;
      background: transparent;
      padding: 0;
    }

    .color-hex {
      font-size: 9.5px;
      font-family: monospace;
      color: var(--abhi-text-secondary, #475569);
    }

    .customizer-actions-row {
      display: flex;
      justify-content: flex-end;
      gap: 6px;
      margin-top: 4px;
      border-top: 1px solid var(--abhi-border, rgba(0, 153, 204, 0.15));
      padding-top: 8px;
    }

    .action-btn {
      padding: 5px 10px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--abhi-transition-fast, 160ms);
    }

    .reset-btn {
      background: transparent;
      border: 1px solid var(--abhi-border, rgba(0, 153, 204, 0.15));
      color: var(--abhi-text-muted, #64748b);
      margin-right: auto;
    }

    .cancel-btn {
      background: transparent;
      border: 1px solid var(--abhi-border, rgba(0, 153, 204, 0.15));
      color: var(--abhi-text-secondary, #475569);
    }

    .save-btn {
      background: var(--abhi-cyan, #0099cc);
      border: none;
      color: #ffffff;
      font-weight: 700;
    }

    /* 6. Spatial Node Inspector */
    .spatial-node-inspector {
      position: absolute;
      top: 74px;
      right: 20px;
      width: 290px;
      max-height: calc(100vh - 120px);
      overflow-y: auto;
      background: var(--abhi-surface-raised, #ffffff);
      border: 1px solid var(--abhi-border-active, rgba(0, 153, 204, 0.42));
      border-radius: 16px;
      box-shadow: var(--abhi-raised-shadow, 9px 9px 24px rgba(0, 0, 0, 0.22));
      padding: 14px;
      z-index: 120;
      pointer-events: auto;
      animation: slideIn 0.25s ease-out;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateX(12px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .inspector-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      border-bottom: 1px solid var(--abhi-border, rgba(0, 153, 204, 0.15));
      padding-bottom: 8px;
    }

    .node-title-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .node-type-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--abhi-cyan, #0099cc);
      box-shadow: 0 0 6px var(--abhi-cyan, #0099cc);
    }

    .node-name {
      font-size: 13px;
      font-weight: 700;
      color: var(--abhi-text-primary, #0f172a);
    }

    .close-inspector-btn {
      background: none;
      border: none;
      color: var(--abhi-text-muted, #64748b);
      cursor: pointer;
      font-size: 14px;
    }

    .inspector-body {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .inspector-field {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .field-label {
      font-size: 9.5px;
      font-weight: 600;
      color: var(--abhi-text-muted, #64748b);
      text-transform: uppercase;
    }

    .field-val {
      font-size: 11.5px;
      color: var(--abhi-text-primary, #0f172a);
    }

    .badge-tier {
      display: inline-block;
      padding: 2px 6px;
      background: rgba(255, 202, 112, 0.15);
      color: var(--abhi-amber, #d97706);
      border-radius: 6px;
      font-family: monospace;
      font-size: 10.5px;
    }

    .caps-tags-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 3px;
    }

    .cap-tag {
      font-size: 9.5px;
      font-family: monospace;
      padding: 2px 6px;
      background: var(--abhi-surface-inset, #f1f5f9);
      border: 1px solid var(--abhi-border, rgba(0, 153, 204, 0.15));
      border-radius: 6px;
      color: var(--abhi-cyan, #0099cc);
    }

    /* 7. Contextual Task Status Overlay */
    .contextual-task-overlay {
      position: absolute;
      bottom: 140px;
      left: 50%;
      transform: translateX(-50%);
      width: calc(100% - 32px);
      max-width: 620px;
      z-index: 50;
      pointer-events: auto;
      animation: taskFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      box-sizing: border-box;
    }

    @keyframes taskFadeIn {
      from { opacity: 0; transform: translate(-50%, 14px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }

    .task-status-pill {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      background: var(--abhi-surface-raised, #ffffff);
      border: 1px solid var(--abhi-border-active, rgba(0, 153, 204, 0.42));
      border-radius: var(--abhi-radius-control, 18px);
      box-shadow: var(--abhi-raised-shadow, 9px 9px 22px rgba(0, 0, 0, 0.18));
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }

    .stage-indicator-orb {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--abhi-surface-inset, #f1f5f9);
      border: 1px solid var(--abhi-border, rgba(0, 153, 204, 0.15));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
    }

    .spinner-dot {
      width: 10px;
      height: 10px;
      border: 2px solid var(--abhi-cyan, #0099cc);
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .check-mark { color: var(--abhi-success, #10b981); font-weight: bold; }
    .error-mark { color: var(--abhi-danger, #ef4444); font-weight: bold; }
    .info-mark { color: var(--abhi-cyan, #0099cc); }

    .task-info-block {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .task-primary-line {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .task-stage-badge {
      font-size: 10px;
      font-family: monospace;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 6px;
      background: rgba(0, 153, 204, 0.15);
      color: var(--abhi-cyan, #0099cc);
      flex-shrink: 0;
    }

    .task-goal-text {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--abhi-text-primary, #0f172a);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .task-message-line {
      font-size: 11px;
      color: var(--abhi-text-secondary, #475569);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .task-actions-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .task-cancel-btn {
      padding: 4px 8px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid var(--abhi-danger, #ef4444);
      color: var(--abhi-danger, #ef4444);
      border-radius: 6px;
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
    }

    .task-dismiss-btn {
      background: none;
      border: none;
      color: var(--abhi-text-muted, #64748b);
      cursor: pointer;
      font-size: 14px;
    }

    /* 8. Holographic Voice Spectral Waveform & Quick Action Matrix */
    .dock-floating-auxiliary {
      width: 100%;
      max-width: 720px;
      margin: 0 auto 8px auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      z-index: 48;
      pointer-events: auto;
      box-sizing: border-box;
      padding: 0 8px;
    }

    .voice-spectral-analyzer {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 4px;
      height: 22px;
      padding: 0 16px;
      opacity: 0.6;
      transition: opacity 0.3s ease;
    }

    .voice-spectral-analyzer.active {
      opacity: 1;
    }

    .spectrum-bar {
      width: 3px;
      height: 6px;
      border-radius: 2px;
      background: linear-gradient(to top, var(--abhi-cyan, #0099cc), var(--abhi-blue, #0284c7));
      box-shadow: 0 0 6px rgba(0, 153, 204, 0.4);
      transition: height 0.1s ease;
      animation: spectrumBounce 1.2s infinite ease-in-out;
      animation-delay: calc(var(--bar-index) * 0.08s);
    }

    .voice-spectral-analyzer.active .spectrum-bar {
      animation-duration: 0.6s;
    }

    @keyframes spectrumBounce {
      0%, 100% { height: 4px; }
      50% { height: 18px; }
    }

    .spatial-quick-matrix {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 6px;
      width: 100%;
    }

    .quick-chip-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 5px 10px;
      background: var(--abhi-surface-raised, rgba(255, 255, 255, 0.88));
      border: 1px solid var(--abhi-border, rgba(0, 153, 204, 0.18));
      border-radius: 14px;
      box-shadow: var(--abhi-raised-shadow, 3px 3px 8px rgba(0, 0, 0, 0.05));
      color: var(--abhi-text-secondary, #475569);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: all var(--abhi-transition-fast, 160ms);
      white-space: nowrap;
    }

    .quick-chip-btn:hover {
      border-color: var(--abhi-cyan, #0099cc);
      color: var(--abhi-cyan, #0099cc);
      box-shadow: 0 0 10px rgba(0, 153, 204, 0.25);
      transform: translateY(-1px);
    }

    .chip-icon {
      font-size: 11px;
    }

    /* 9. Floating Neumorphic Command Dock */
    .neumorphic-dock-container {
      width: 100%;
      max-width: 720px;
      margin: 0 auto;
      z-index: 50;
      pointer-events: auto;
      box-sizing: border-box;
      padding: 0 4px;
    }

    .neumorphic-dock-shell {
      position: relative;
      background: var(--abhi-surface-raised, #ffffff);
      border: 1px solid var(--abhi-border, rgba(0, 153, 204, 0.2));
      border-radius: var(--abhi-radius-dock, 24px);
      box-shadow: var(--abhi-raised-shadow, 9px 9px 22px rgba(0, 0, 0, 0.12), -6px -6px 18px rgba(255, 255, 255, 0.8));
      padding: 8px 12px;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      transition: all var(--abhi-transition-normal, 280ms);
    }

    .neumorphic-dock-shell.working {
      border-color: var(--abhi-border-active, rgba(0, 153, 204, 0.5));
      box-shadow: var(--abhi-raised-shadow), 0 0 24px rgba(0, 153, 204, 0.35);
    }

    .dock-form {
      width: 100%;
    }

    .dock-input-wrapper {
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--abhi-surface-inset, #f1f5f9);
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 18px;
      box-shadow: var(--abhi-inset-shadow, inset 3px 3px 8px rgba(0, 0, 0, 0.08), inset -3px -3px 8px rgba(255, 255, 255, 0.8));
      padding: 6px 10px;
    }

    .dock-ai-icon {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--abhi-cyan, #0099cc);
      font-size: 16px;
    }

    .dock-ai-icon.glow {
      animation: pulseGlow 2s infinite;
    }

    .dock-spin {
      animation: spin 1s linear infinite;
    }

    .dock-input-field {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--abhi-text-primary, #0f172a);
      font-size: 13.5px;
      font-weight: 500;
      padding: 6px 4px;
      min-width: 0;
    }

    .dock-input-field::placeholder {
      color: var(--abhi-text-muted, #64748b);
      font-size: 13px;
    }

    .dock-controls-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .dock-control-btn {
      width: 36px;
      height: 36px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--abhi-surface-raised, #ffffff);
      border: 1px solid var(--abhi-border, rgba(0, 153, 204, 0.2));
      box-shadow: 4px 4px 10px rgba(0, 0, 0, 0.08), -2px -2px 6px rgba(255, 255, 255, 0.8);
      color: var(--abhi-text-secondary, #475569);
      cursor: pointer;
      transition: all var(--abhi-transition-fast, 160ms);
    }

    .dock-control-btn:hover:not(:disabled) {
      border-color: var(--abhi-cyan, #0099cc);
      color: var(--abhi-cyan, #0099cc);
      transform: translateY(-1px);
    }

    .dock-control-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .voice-btn.listening {
      background: rgba(0, 153, 204, 0.2);
      border-color: var(--abhi-cyan, #0099cc);
      color: var(--abhi-cyan, #0099cc);
      box-shadow: 0 0 12px rgba(0, 153, 204, 0.6);
      animation: voicePulse 1.2s infinite;
    }

    @keyframes voicePulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.08); }
    }

    .submit-btn {
      background: linear-gradient(135deg, var(--abhi-blue, #0284c7) 0%, var(--abhi-cyan, #0099cc) 100%);
      border: none;
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(0, 153, 204, 0.35);
    }

    .submit-btn:hover:not(:disabled) {
      box-shadow: 0 6px 20px rgba(0, 153, 204, 0.55);
      color: #ffffff;
    }

    .dock-error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      padding: 6px 12px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 12px;
      color: var(--abhi-danger, #ef4444);
      font-size: 12px;
    }

    .error-close {
      margin-left: auto;
      background: none;
      border: none;
      color: var(--abhi-danger, #ef4444);
      cursor: pointer;
      font-size: 13px;
    }

    /* Responsive Breakpoints */
    @media (max-width: 1380px) {
      .hud-corner-bracket {
        display: none;
      }
    }

    @media (max-width: 1024px) {
      .hud-center-telemetry {
        display: none;
      }
      .holographic-telemetry-panel, .holographic-swarm-panel {
        top: auto;
        bottom: 180px;
        max-height: 280px;
      }
      .flank-min-trigger {
        top: auto;
        bottom: 180px;
      }
    }

    @media (max-width: 768px) {
      .main-agent-spatial-container {
        padding: 10px 12px;
      }
      .btn-text, .switcher-text {
        display: none;
      }
      .hud-brand-pill {
        padding: 6px 10px;
      }
      .brand-title {
        font-size: 13px;
      }
      .brand-sub {
        display: none;
      }
      .subconscious-thought-bar {
        width: 100%;
        margin-top: 4px;
        padding: 4px 10px;
      }
      .thought-prefix {
        display: none;
      }
      .thought-quantum-tag {
        display: none;
      }
      .thought-stream-text {
        font-size: 10.5px;
      }
      .holographic-telemetry-panel, .holographic-swarm-panel {
        width: calc(100vw - 32px);
        left: 16px;
        right: 16px;
        bottom: 180px;
        max-height: 250px;
      }
      .theme-customizer-panel {
        width: calc(100vw - 32px);
        right: 16px;
        left: 16px;
        top: 60px;
      }
      .spatial-node-inspector {
        width: calc(100vw - 32px);
        right: 16px;
        left: 16px;
        top: 60px;
      }
      .spatial-quick-matrix {
        display: none;
      }
      .dock-input-field::placeholder {
        font-size: 11.5px;
      }
    }
  `]
})
export class HomePageComponent implements OnInit, OnDestroy {
  readonly stateService = inject(OperatorStateService);
  readonly commandService = inject(AgentCommandService);
  readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly threeScene = inject(ThreeSceneManagerService);

  commandInput = '';
  readonly inputPlaceholder = "Ask ABHI or command your desktop (e.g. 'Open Calculator and calculate 125 times 48')...";
  readonly showWorkspaceMenu = signal(false);
  readonly showThemeCustomizer = signal(false);
  readonly showNeuralInspector = signal(false);
  readonly isListening = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly selectedNode = signal<SpatialNodeData | null>(null);

  // Responsive Flank Panel Toggles
  readonly showTelemetry = signal(true);
  readonly showSwarm = signal(true);

  readonly spectralBars = Array.from({ length: 16 }, (_, i) => i);

  readonly subconsciousThoughts = [
    'Autonomous Core: Monitoring OS desktop automation surfaces (Windows UIAutomation + Playwright)...',
    'Dual-State Physical Verifier: Live pixel differential verification & process handle inspection...',
    'Local Inference Core: Ollama quantization weights synchronized with zero external telemetry...',
    'Specialist Swarm: 8 autonomous agents connected via high-speed action-potential conduits...',
    'Cognitive Memory: SQLite WAL persistent graph primed, zero uncommitted transitions...',
    'Three.js Quantum Void: 1,400 vortex particles, nested icosahedron & expanding shockwaves active...'
  ];
  readonly activeThoughtIndex = signal(0);
  readonly activeSubconsciousThought = computed(() => this.subconsciousThoughts[this.activeThoughtIndex()]);
  private thoughtIntervalId: any = null;

  readonly specialistAgents: SpatialNodeData[] = [
    { id: 'supervisor', name: 'Central Supervisor', role: 'Task Decomposition & Orchestration', status: 'ACTIVE', capabilities: ['Decomposition', 'Plan Validation', 'Safety Gate'], riskTier: 'CRITICAL' },
    { id: 'vision', name: 'Vision Perception Agent', role: 'Real-Time Screen Perception & OCR', status: 'ACTIVE', capabilities: ['Screen Grab', 'OCR', 'Element Detection'], riskTier: 'STANDARD' },
    { id: 'desktop', name: 'Windows Desktop Agent', role: 'Physical UI Automation & Keystrokes', status: 'ACTIVE', capabilities: ['UIAutomation', 'Mouse/Keyboard', 'Window Focus'], riskTier: 'ELEVATED' },
    { id: 'browser', name: 'Browser Agent', role: 'Playwright Web Automation & Navigation', status: 'ACTIVE', capabilities: ['Playwright', 'DOM Tree Parsing', 'Session State'], riskTier: 'ELEVATED' },
    { id: 'coder', name: 'Code Generation Agent', role: 'Syntactic AST & Self-Healing Patching', status: 'ACTIVE', capabilities: ['TypeScript', 'Python', 'AST Repair'], riskTier: 'HIGH' },
    { id: 'terminal', name: 'Terminal Execution Agent', role: 'PowerShell Sandboxed Execution', status: 'ACTIVE', capabilities: ['PowerShell', 'Exit Code Audit', 'Process Monitor'], riskTier: 'CRITICAL' },
    { id: 'memory', name: 'Persistent Memory Agent', role: 'SQLite WAL & Semantic RAG Retrieval', status: 'ACTIVE', capabilities: ['Vector Search', 'WAL Commit', 'History Index'], riskTier: 'STANDARD' },
    { id: 'safety', name: 'Safety Sentinel', role: 'Dual-State Physical Verification', status: 'ACTIVE', capabilities: ['State Verification', 'Killswitch', 'Pre-flight Check'], riskTier: 'CRITICAL' }
  ];

  readonly isWorking = computed(() => {
    return this.commandService.isWorking() || this.stateService.isBusy();
  });

  readonly systemStatusLabel = computed(() => {
    if (this.stateService.safety().emergencyStopped) return 'EMERGENCY STOP';
    if (this.isWorking()) return 'EXECUTING';
    return 'ONLINE / READY';
  });

  readonly activeTaskStatus = computed(() => {
    const activeResult = this.commandService.activeResult();
    const currTask = this.stateService.currentTask();

    if (activeResult) {
      return {
        stage: activeResult.type === 'ERROR_RESULT' ? 'FAILED' : 'COMPLETED',
        command: activeResult.title,
        message: activeResult.summary || activeResult.errorMessage || 'Verified execution complete'
      };
    }

    if (currTask) {
      return {
        stage: currTask.state || 'EXECUTING',
        command: currTask.goal,
        message: currTask.currentStep || 'Processing verified action...'
      };
    }

    return null;
  });

  readonly workspaceRoutes = [
    {
      id: 'network',
      title: 'Agent Network',
      desc: 'Interactive 3D graph of 9 specialist agents & dependencies',
      route: '/network',
      badge: '9 AGENTS'
    },
    {
      id: 'intelligence',
      title: 'Intelligence Lab',
      desc: 'Model observatory, category benchmarks & self-healing core',
      route: '/intelligence',
      badge: 'EVALUATION'
    },
    {
      id: 'business',
      title: 'Business Sectors',
      desc: 'Autonomous sector projects & honest financial metrics',
      route: '/business',
      badge: '6 SECTORS'
    },
    {
      id: 'media',
      title: 'Media Studio',
      desc: 'Local video reels, inpainting & provenance attestations',
      route: '/media',
      badge: 'PHASE 8'
    }
  ];

  constructor() {
    effect(() => {
      if (this.stateService.safety().emergencyStopped) {
        this.threeScene.setEnergyState('ERROR');
      } else if (this.isListening()) {
        this.threeScene.setEnergyState('LISTENING');
      } else if (this.isWorking()) {
        this.threeScene.setEnergyState('EXECUTING');
      } else if (this.activeTaskStatus()?.stage === 'COMPLETED') {
        this.threeScene.setEnergyState('VERIFIED');
      } else {
        this.threeScene.setEnergyState('IDLE');
      }
    });

    // Check window width on initialization for smart default
    if (typeof window !== 'undefined' && window.innerWidth < 1360) {
      this.showTelemetry.set(false);
      this.showSwarm.set(false);
    }
  }

  ngOnInit(): void {
    this.threeScene.setMode('MAIN_AGENT');
    this.thoughtIntervalId = setInterval(() => {
      this.activeThoughtIndex.update((idx) => (idx + 1) % this.subconsciousThoughts.length);
    }, 4500);
  }

  ngOnDestroy(): void {
    this.showWorkspaceMenu.set(false);
    this.showThemeCustomizer.set(false);
    if (this.thoughtIntervalId) {
      clearInterval(this.thoughtIntervalId);
      this.thoughtIntervalId = null;
    }
  }

  selectSpecialistAgent(agent: SpatialNodeData): void {
    this.selectedNode.set(agent);
  }

  executeQuickAction(action: string): void {
    switch (action) {
      case 'vision':
        this.commandInput = 'Scan screen and inspect active windows';
        this.onSubmitCommand();
        break;
      case 'neural':
        this.toggleNeuralInspector();
        break;
      case 'network':
        this.navigateTo('/network');
        break;
      case 'verify':
        this.commandInput = 'Verify physical state of desktop and running processes';
        this.onSubmitCommand();
        break;
      case 'lab':
        this.navigateTo('/intelligence');
        break;
    }
  }

  toggleWorkspaceMenu(): void {
    this.showWorkspaceMenu.update((v) => !v);
    if (this.showWorkspaceMenu()) {
      this.showThemeCustomizer.set(false);
    }
  }

  toggleThemeCustomizer(): void {
    this.showThemeCustomizer.update((v) => !v);
    if (this.showThemeCustomizer()) {
      this.showWorkspaceMenu.set(false);
      this.showNeuralInspector.set(false);
    }
  }

  toggleNeuralInspector(): void {
    this.showNeuralInspector.update((v) => !v);
    if (this.showNeuralInspector()) {
      this.showWorkspaceMenu.set(false);
      this.showThemeCustomizer.set(false);
    }
  }

  closeThemeCustomizer(): void {
    this.showThemeCustomizer.set(false);
  }

  selectPreset(presetId: string): void {
    this.themeService.setPreset(presetId);
  }

  onColorChange(key: keyof AbhiThemeColors, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input) {
      this.themeService.setLivePreviewColor(key, input.value);
    }
  }

  saveTheme(): void {
    this.themeService.saveCustomTheme();
  }

  cancelThemePreview(): void {
    this.themeService.cancelCustomPreview();
  }

  resetTheme(): void {
    this.themeService.resetToDefault();
  }

  navigateTo(route: string): void {
    this.showWorkspaceMenu.set(false);
    this.router.navigateByUrl(route);
  }

  toggleVoiceInput(): void {
    this.isListening.update((v) => !v);
    if (this.isListening()) {
      this.commandInput = 'Listening for speech...';
      setTimeout(() => {
        if (this.isListening()) {
          this.commandInput = 'Open Calculator and calculate 125 times 48';
          this.isListening.set(false);
        }
      }, 2000);
    }
  }

  async onSubmitCommand(): Promise<void> {
    const text = this.commandInput.trim();
    if (!text || this.isWorking()) return;

    this.errorMessage.set(null);
    try {
      await this.commandService.submitCommand(text, 'TEXT', 'auto');
      this.commandInput = '';
    } catch (err: any) {
      this.errorMessage.set(err?.message || 'Failed to submit command to Authoritative Gateway.');
    }
  }

  clearCommand(): void {
    this.commandInput = '';
    this.errorMessage.set(null);
  }

  cancelTask(): void {
    this.stateService.cancelActiveTask();
  }

  dismissTaskOverlay(): void {
    this.commandService.dismissResult();
  }

  triggerEmergencyStop(): void {
    this.stateService.triggerEmergencyStop();
  }
}
