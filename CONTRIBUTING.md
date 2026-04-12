# Contributing to Text Harvester

Thank you for your interest in contributing to Text Harvester — an OCR tool built for the heritage and archival sector. Contributions from historians, archivists, developers, and genealogists are all welcome.

## Ways to Contribute

- **Bug reports** — something isn't extracting correctly, or the application errors
- **Feature requests** — ideas for new record types, providers, or export formats
- **Code** — bug fixes, new features, performance improvements
- **Documentation** — improve clarity, add examples, fix typos
- **Testing** — run the tool against real (anonymised) records and report findings

## Reporting Bugs

Open an issue at https://github.com/donalotiarnaigh/textharvester-web/issues using the **Bug Report** template. Please include:

- Record type (memorial / burial register / grave record card)
- AI provider used (OpenAI / Anthropic / Gemini / Mistral)
- Steps to reproduce
- Expected vs actual output
- Extracted JSON if applicable (anonymise any personal data)
- Node.js version and OS

## Feature Requests

Open an issue using the **Feature Request** template. For anything substantial, open an issue to discuss the approach before starting work — this avoids duplication and keeps the project focused on heritage use cases.

## Development Setup

See the [README](README.md) for full installation instructions. The short version:

```bash
git clone https://github.com/donalotiarnaigh/textharvester-web.git
cd textharvester-web
npm install
cp .env.example .env   # then add your API keys
npm start
```

## Coding Standards

ESLint is configured and enforced on commit via Husky. Before submitting a PR:

```bash
npm run lint    # check for issues
npm test        # all tests must pass
```

Style rules (enforced automatically): single quotes, 2-space indentation, Unix line endings, semicolons required.

## Testing

All new behaviour must be covered by tests. Tests live in `__tests__/` and mirror the `src/` structure.

```bash
npm test             # run the full test suite
npm run coverage     # run with coverage report
```

## Pull Request Process

1. Fork the repository and create a branch from `main`
2. Make your changes with tests
3. Ensure `npm test` and `npm run lint` both pass
4. Open a PR against `main` — the CI pipeline will run automatically
5. A maintainer will review and merge

## Commit Messages

No strict convention is enforced. Write clear, descriptive prose — e.g. `add confidence threshold config option` rather than `update config`. Reference the issue number where relevant: `fix burial register date parsing (#45)`.

## Questions

Contact [daniel@curlew.ie](mailto:daniel@curlew.ie) or open a discussion on GitHub.
