# Backstage Template Generator

AI-powered system for generating Backstage templates through intent-driven development using Kiro's Vibe Coding approach.

## Overview

This system transforms developer intent into executable Backstage templates, enabling continuous expansion of IDP (Internal Developer Platform) capabilities. It leverages natural language processing to convert high-level descriptions into complete Backstage template artifacts including YAML configurations, skeleton repositories, validation logic, and documentation.

## Features

- **Intent-Driven Development**: Convert natural language descriptions into Backstage templates
- **Capability Maturity Management**: Support for L1-L5 maturity progression
- **GitOps Integration**: Complete lifecycle management through Git workflows
- **Organizational Standards**: Automatic enforcement of security, compliance, and governance policies
- **Template Discovery**: Searchable catalog with reuse recommendations

## Architecture

The system consists of four main components:

1. **Intent Parser**: Converts natural language to structured specifications
2. **Template Generator**: Produces complete Backstage template artifacts
3. **GitOps Manager**: Manages template lifecycle through Git workflows
4. **Capability Registry**: Tracks capabilities and enables discovery

## Development

### Prerequisites

- Node.js 18+
- TypeScript 5+
- Jest for testing

### Setup

```bash
npm install
```

### Scripts

```bash
# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test

# Run property-based tests
npm run test:property

# Watch mode for tests
npm run test:watch

# Lint code
npm run lint

# Format code
npm run format
```

### Testing

The project uses a dual testing approach:

- **Unit Tests**: Specific examples and edge cases
- **Property-Based Tests**: Universal properties across all inputs using fast-check

Property tests run with minimum 100 iterations to ensure comprehensive coverage.

## Project Structure

```
src/
├── types/           # Core type definitions
├── interfaces/      # Component interfaces
├── implementations/ # Component implementations (to be added)
├── utils/          # Utility functions (to be added)
└── __tests__/      # Test files (to be added)
```

## License

MIT