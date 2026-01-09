# Changelog

All notable changes to Auto-Cursor will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]


### Added

- **Memory Layer Integration** - Agents learn from past successful builds and use insights to create better plans
  - Automatic memory saving after successful builds (≥80% completion)
  - Memory context included in planning prompts
  - Pattern extraction from completed tasks
  - Project type and tech stack detection
  - Cross-session knowledge retention
- Interactive planning with step-by-step goal refinement
- Complexity override for faster iteration (simple/medium/complex)
- PAUSE file support for graceful task pausing without killing agents
- HUMAN_INPUT.md support for injecting instructions mid-execution
- Plan validation to catch errors early
- Plan review and editing capabilities
- Task management (add, remove, modify tasks)
- Task control (pause or cancel individual tasks)
- Enhanced progress tracking with time estimates and progress bars
- Detailed status view with `--detailed` flag


### Changed

- Improved planning workflow with interactive mode
- Enhanced monitoring with better progress visualization


### Fixed

- N/A

## [1.0.0] - 2026-01-09


### Added

- Initial public release
