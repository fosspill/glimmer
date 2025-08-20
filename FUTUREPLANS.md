This is, for now, just some notes on what I would like to do, and what I do not want to do:


* Glimmer **stays** relying on websockets. This comes at the cost of flexibility, but for a lightweight client this feels right. It also leaves us in a good state when it comes to TOS, since we do not touch the game at all.
* ^ This means I do not wish to interface with the game directly. This leaves nametags and such as very hard tasks, if at all possible.
* Explore **iOS** build. This would mean build the native bridge and such again, but the injection and logic SHOULD still work the same.
* ~~Make launcher prettier~~ ✅ **COMPLETED** - Now has sparkling RuneScape Classic-inspired design!
* ~~Add PM alerts ('42["pm",{"type":0,"from":"XXXXX","msg":"buying gf"}]')~~ ✅ **COMPLETED**
* **F-Droid Repository Setup** - Automated APK builds and F-Droid repo hosting via GitHub Actions

## F-Droid Repository Implementation Plan

### Phase 1: APK Build Automation
- [ ] Create GitHub Action workflow for automated APK builds
  - [ ] Setup Android SDK and build tools in CI
  - [ ] Configure signing keys (release keystore) as GitHub secrets
  - [ ] Build both debug and release APKs on git tags
  - [ ] Upload APK artifacts to GitHub releases

### Phase 2: F-Droid Metadata Setup
- [ ] Create F-Droid metadata structure
  - [ ] `metadata/io.glimmer.client.yml` - App metadata file
  - [ ] Define app categories, description, changelog format
  - [ ] Configure build recipes and dependencies
  - [ ] Set up proper versioning scheme (using git tags)

### Phase 3: F-Droid Repository Hosting
- [ ] Setup F-Droid repository infrastructure
  - [ ] Create `fdroiddata` repository structure
  - [ ] Configure F-Droid server tools (fdroidserver)
  - [ ] Generate repository index and signing keys
  - [ ] Host repository files via GitHub Pages

### Phase 4: Automated Repository Updates
- [ ] Create GitHub Action for F-Droid repo maintenance
  - [ ] Auto-update metadata on new releases
  - [ ] Rebuild repository index when APKs are updated
  - [ ] Deploy updated repo to GitHub Pages
  - [ ] Validate APK signatures and metadata

### Phase 5: Documentation & Distribution
- [ ] Create installation instructions
  - [ ] How to add custom F-Droid repo URL
  - [ ] Direct APK download links as fallback
  - [ ] Update README with installation methods
- [ ] Add F-Droid repo QR code and URL to README
  - [ ] Generate QR code for easy mobile scanning
  - [ ] Include both QR code image and clickable repo URL
  - [ ] Add "Add to F-Droid" button/badge for easy access
- [ ] Setup monitoring for build failures and repo health

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