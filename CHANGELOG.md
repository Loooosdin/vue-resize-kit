# Changelog

All notable changes follow [Semantic Versioning](https://semver.org/).

## 0.1.0 - Unreleased

### Added

- Framework-agnostic `observeResize` Core API.
- Vue 2.6+ and Vue 3.2+ directives and plugin registration.
- Vue 2.7+/Vue 3.2+ `useResizeObserver` composable.
- Box selection, filtering, scheduling, pause/resume/stop, SSR safety, and polyfill injection.

### Fixed

- Prevent `previousSize` from retaining a complete chain of prior resize events.
- Correctly distinguish direct form elements from ref-like targets.
- Cancel scheduled resize events after the latest size returns below the configured threshold.
- Report the actual `content-box` source when requested box data is unavailable.

### Changed

- Reset composable measurement state when its target changes.
- Validate runtime enum and boolean options before scheduling.
- Narrow the Vue peer range so it does not implicitly claim Vue 4 compatibility.
