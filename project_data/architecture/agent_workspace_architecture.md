# Autonomous Agent Workspace Architecture (Phase 9 Stage 3)

## 1. Overview
The `/ask` Autonomous Agent Workspace (`AskWorkspacePageComponent`) provides the primary human-to-agent surface for ABHI. It acts as the central hub where operators issue multimodal commands (text, voice, multilingual) and view polymorphic execution outcomes without navigating across fragmented dashboard views.

## 2. Layout Structure & Experience Modes
1. **Attention & Consent Strip**:
   - Displays real-time alerts for Tier 3 Critical actions requiring operator approval (`AgentAttentionService`).
   - Enables one-click Approval or Cancellation directly on the active workspace.
2. **Central Hero Command Center**:
   - Integrates `AgentCommandCenterComponent` with glassmorphic focus aura, voice push-to-talk simulation, and multilingual suggestion pills.
3. **Autonomous Capabilities Gateway**:
   - Provides quick action cards for high-frequency workflows: Quick Math & Apps, Multimodal Media, System Telemetry, and Multilingual Voice/Text.
4. **Outcome Projections**:
   - Seamlessly embeds `UniversalResultSheetComponent` and `AgentTaskCardComponent` directly under the input area.

## 3. Experience Projections
- **USER Mode**: Focuses purely on natural outcome cards, humanized status strings, and result downloads/previews.
- **ADVANCED Mode**: Reveals workflow milestones, model/device allocation, and artifact lineage.
- **DEVELOPER Mode**: Exposes raw command IDs, task IDs, thread IDs, worker PIDs, lease IDs, and AST execution details.
