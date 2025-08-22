This is, for now, just some notes on what I would like to do, and what I do not want to do:


* Glimmer **stays** relying on websockets. This comes at the cost of flexibility, but for a lightweight client this feels right. It also leaves us in a good state when it comes to TOS, since we do not touch the game at all.
* ^ This means I do not wish to interface with the game directly. This leaves nametags and such as very hard tasks, if at all possible.
* Explore **iOS** build. This would mean build the native bridge and such again, but the injection and logic SHOULD still work the same.
* ~~Make launcher prettier~~ ✅ **COMPLETED** - Now has sparkling RuneScape Classic-inspired design!
* ~~Add PM alerts ('42["pm",{"type":0,"from":"XXXXX","msg":"buying gf"}]')~~ ✅ **COMPLETED**
* ~~**F-Droid Repository Setup**~~ ❌ **CANCELLED** - F-Droid requires complex cryptographic signing. Direct APK distribution is simpler and more reliable.
* **In-App Update Checker** - Automatic update notifications and download prompts in the launcher

## APK Distribution & Updates Plan

### Phase 1: APK Build Automation ✅ **COMPLETED**
- [x] Create GitHub Action workflow for automated APK builds
  - [x] Setup Android SDK and build tools in CI
  - [x] Configure signing keys (release keystore) as GitHub secrets
  - [x] Build both debug and release APKs on git tags
  - [x] Upload APK artifacts to GitHub releases

### Phase 2: Direct APK Distribution ✅ **COMPLETED**
- [x] Update README with direct download instructions
  - [x] GitHub Releases download link with badge
  - [x] QR code for easy mobile access
  - [x] Clear installation steps
- [x] Remove complex F-Droid infrastructure
  - [x] Clean up unnecessary workflows
  - [x] Focus on what actually works

### Phase 3: In-App Update Checker 🔄 **PLANNED**
- [ ] Add version check API call to GitHub releases
  - [ ] Compare current app version with latest release
  - [ ] Show update notification in launcher UI
  - [ ] Provide direct download link to latest APK
- [ ] Update notification UI
  - [ ] Non-intrusive banner in launcher
  - [ ] "Update Available" button with version info
  - [ ] Optional: Auto-download APK (with user permission)
- [ ] Settings integration
  - [ ] "Check for updates" manual button
  - [ ] Toggle for automatic update checks
  - [ ] Update frequency settings (daily/weekly)

## Code Refactoring Tasks

### Major Design Issues to Address
- [ ] **Dual WebSocket/XHR Handling** - Remove redundancy between early WebSocket interception and NetworkMonitor
- [ ] **Settings Validation Cleanup** - Create centralized settings helper to replace scattered validation logic
- [ ] **Mixed Message Handling** - Unify message processing into single entry point
- [ ] **Giant handlePacket Switch** - Extract packet handlers into separate modules
- [ ] **WorldMap Coupling** - Decouple WorldMap from main Glimmer object
- [ ] **Initialization Race Conditions** - Simplify multiple initialization points

### Proposed Refactoring Structure
- [ ] **SettingsHelper** - Centralized settings validation (`isEnabled(setting)`)
- [ ] **PacketHandlers** - Separate handlers for each packet type
  - [ ] Movement handler (packet 1)
  - [ ] Chunk entry handler (packet 3) 
  - [ ] Damage handler (packet 8)
  - [ ] Idle handler (packet 13)
  - [ ] PM handler
- [ ] **Unified Message Processing** - Single router for WebSocket/XHR messages
- [ ] **Separation of Concerns** - Split into focused modules:
  - [ ] GameState (position, health, entity tracking)
  - [ ] AlertManager (all notifications)
  - [ ] NetworkManager (network interception)
  - [ ] WorldMap (standalone map functionality)
- [ ] **Remove Redundant Monitoring** - Pick single WebSocket interception approach

### Progress Tracking
- [ ] Phase 1: Settings Helper implementation
- [ ] Phase 2: Extract packet handlers
- [ ] Phase 3: Unify message processing
- [ ] Phase 4: Separate concerns into modules
- [ ] Phase 5: Remove redundant code paths