# Changelog

All notable changes to this project will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [1.0.0] — 2023-12-11

### Added
- OCR processing for graveyard memorials, burial registers, and grave record cards
- Multi-provider support: OpenAI, Anthropic, Gemini, Mistral
- Confidence scoring per field with configurable review and auto-accept thresholds
- Cross-field validation (identical names, implausible ages) with automatic needs-review flagging
- Background PDF-to-JPEG conversion — uploads return immediately while conversion continues
- Token and cost tracking per session with configurable spend cap
- LLM audit logging with per-file processing correlation IDs
- CLI tool (`th`) for batch ingest and query operations
- Two-layer retry logic: provider-level retries with backoff, and validation-level retry with format-enforcement preamble
- Web UI with drag-and-drop upload, live progress, and results export (CSV)
- SQLite storage for all three record types with inline schema migrations
- Evaluation harness (`npm run eval`) for measuring extraction accuracy against gold-standard fixtures
