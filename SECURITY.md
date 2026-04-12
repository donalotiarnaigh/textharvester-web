# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | Yes       |

## Reporting a Vulnerability

Please **do not** report security vulnerabilities through public GitHub Issues.

Email [daniel@curlew.ie](mailto:daniel@curlew.ie) with:

- A description of the vulnerability
- Steps to reproduce
- Potential impact

You should receive an acknowledgement within 5 business days. After a fix is confirmed, details will be disclosed publicly with appropriate credit to the reporter.

## Scope

**In scope:**
- Authentication or authorisation bypass
- Injection vulnerabilities (SQL, command, path traversal) in the application code
- Unintended exposure of uploaded files or extracted data

**Out of scope:**
- Misconfiguration of a user's own deployment (e.g. committing `.env` files, exposing the server publicly without auth)
- Vulnerabilities in third-party AI provider APIs (OpenAI, Anthropic, Gemini, Mistral) — report these directly to those providers
- Issues requiring physical access to the host machine

## Notes

Text Harvester processes images locally and sends them to third-party AI APIs. It does not store user accounts or personal data beyond the extracted record content written to the local SQLite database. API keys are loaded from `.env` and are never committed or transmitted beyond the configured AI providers.
