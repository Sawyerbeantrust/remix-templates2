# Contributing Guidelines

Thank you for contributing to the Triton Car Lifts showroom and API backend project.

## Development Workflow

1. **Prerequisites**: Node.js 20+ and npm.
2. **Setup**:
   ```bash
   npm install
   cp .env.example .env
   ```
3. **Start Development Server**:
   ```bash
   npm run dev
   ```
4. **Code Quality Standards**:
   - Strictly avoid committing raw secrets to `.env.example` or code.
   - Wrap all async routes with `asyncHandler`.
   - Validate external inputs and size limits before processing.
   - Run tests and lint before submitting PRs:
     ```bash
     npm run test && npm run lint && npm run build
     ```
