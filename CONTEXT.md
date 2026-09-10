# Project context

This is an Electron/Vue YouTube Music desktop fork with built-in ad blocking. Electron Forge and Vite build the main process, sandboxed preloads and Vue windows. See [README.md](README.md) for build and startup-check commands.

## Startup and player integration

- `src/main/index.ts` owns the main window, embedded BrowserView, configuration and IPC. The host window is shown after its local page finishes loading; waiting for the first paint left the window hidden in the verified Linux runtime.
- The music preload in `src/renderer/ytmview/preload.ts` waits for the YouTube store hook and player, installs controls/integrations, then sends `ytmView:loaded`. The main process validates the sender, hides the loading state and attaches the view. Consent and Google login pages also use this message to become visible before music initialization.
- YouTube now exposes player state and `playerApi` through the element's `polymerController`. Player commands, metadata, like-button data, volume-ratio and ad-blocking integration scripts use that controller; DOM insertion and events still use the element itself.
- The reported startup failure was reproduced against live YouTube Music: the old element-level `playerApi` was undefined while `polymerController.playerApi.isReady()` returned true.
- `did-stop-loading` only updates a status string; it does not prove the music preload finished. The UI's 30-second warning likewise does not identify which initialization step is pending. The runtime check independently waits for music initialization and exercises desktop volume control.

## Verification boundaries

`scripts/test-startup.cjs` starts the production bundles in Electron with an isolated temporary profile. It does not run a dev server, install an update, register OS protocol/login handlers or use a signed-in account. It captures runtime errors and separate host/page screenshots. The check must observe music initialization after navigation, not just the earlier consent-page signal.

TypeScript uses bundler resolution to match Vite, avoiding a wildcard alias that hid installed package declarations. The companion-server error handler uses Fastify's error type and public Socket.IO type exports.

Live anonymous startup, visible music UI and desktop volume control have been verified on Linux with software rendering. Windows, signed-in playback, hardware acceleration, installation and updates require their own runtime verification. A live-site check can fail when YouTube or the network changes; retain the evidence rather than weakening the assertion.

## Release builds

The manual `Windows Release Build` workflow builds Windows x64 artifacts with Node.js 24 and the npm lockfile. It points the compiled updater at the current fork, and only uploads build artifacts; publishing a GitHub release is a separate authorized step. Tag pushes no longer invoke the old multi-platform publishing workflow. See the release section in [README.md](README.md).
