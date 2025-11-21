# SmartWordsAI

[![Node](https://img.shields.io/badge/node-22.14.0-339933?logo=node.js)](https://nodejs.org/)
[![Status](https://img.shields.io/badge/status-MVP_in_development-blue)](#project-status)
[![Version](https://img.shields.io/badge/version-0.0.1-black)](#project-status)
[![License](https://img.shields.io/badge/license-Unlicensed-lightgrey)](#license)

SmartWordsAI is an AI-powered vocabulary learning app that generates contextual Polish sentences using user-provided English words. Learners translate the sentences into English, reinforcing vocabulary retention and correct usage in context. Built with Astro + React, TypeScript, Tailwind, and Supabase.

- Target users: learners, exam candidates, teachers, and self-learners who want effective, context-based vocabulary practice.

## Table of contents

- [1. Project name](#smartwordsai)
- [2. Project description](#project-description)
- [3. Tech stack](#tech-stack)
- [4. Getting started locally](#getting-started-locally)
- [5. Available scripts](#available-scripts)
- [6. Project scope](#project-scope)
- [7. Project status](#project-status)
- [8. License](#license)

## Project description

SmartWordsAI uses a language model to generate short, CEFR-aligned Polish sentences with your selected English vocabulary. You translate those sentences into English and receive instant, detailed feedback. The app focuses on context-driven learning rather than rote memorization, helping you internalize vocabulary and correct usage.

- Core value:
  - Contextual learning instead of isolated word memorization
  - Automated, scalable content generation
  - Immediate feedback with clear, actionable explanations

## Tech stack

- Frontend: Astro 5 with React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui
- Backend: Supabase (PostgreSQL, Auth, SDK)
- AI: OpenRouter.ai (access to multiple model providers with budget limits)
- CI/CD: GitHub Actions
- Hosting: DigitalOcean (via Docker image)

Key dependencies: `astro`, `@astrojs/react`, `@astrojs/node`, `@astrojs/sitemap`, `react`, `react-dom`, `tailwindcss`, `class-variance-authority`, `clsx`, `lucide-react`, `tailwind-merge`, `tw-animate-css`.

Dev tooling: ESLint 9 (with Astro/React/TS rules), Prettier + `prettier-plugin-astro`, Husky, lint-staged.

## Getting started locally

- Prerequisites:
  - Node 22.14.0 (use `nvm use` to match `.nvmrc`)
  - npm (or an alternative package manager)

- Setup:
  ```bash
  git clone <your-fork-or-repo-url>
  cd SmartWordsAI
  nvm use
  npm install
  ```

- Environment variables:
  Create a `.env` file in the project root and configure:
  - `SUPABASE_URL=<your-supabase-url>`
  - `SUPABASE_ANON_KEY=<your-supabase-anon-key>`
  - `OPENROUTER_API_KEY=<your-openrouter-api-key>`
  
  Notes:
  - Supabase provides the project URL and anon key in its dashboard.
  - OpenRouter API keys can enforce spending limits.

- Run in development:
  ```bash
  npm run dev
  ```
  The app starts with Astro's dev server. Follow the terminal URL.

- Build for production:
  ```bash
  npm run build
  ```
- Preview production build:
  ```bash
  npm run preview
  ```

- Code quality:
  ```bash
  npm run lint       # ESLint
  npm run lint:fix   # ESLint with --fix
  npm run format     # Prettier
  ```

## Available scripts

- `dev`: start Astro dev server
- `build`: build the production site
- `preview`: preview the production build locally
- `astro`: run the Astro CLI
- `lint`: run ESLint across the project
- `lint:fix`: run ESLint with auto-fix
- `format`: run Prettier formatting

## Project scope

- In scope (MVP):
  - Auth: register, login, password reset, logout, session protection
  - Vocabulary sets: create (max 5 words), edit, delete, list; CEFR level (A1–C2)
  - Sentence generation: 2–3 Polish sentences per word; ≤15 words per sentence; CEFR-tuned; daily limit of 10 generations per user
  - Practice: translate to English; case/punctuation-insensitive checks; required articles (a/an/the); colored diff/error highlights; concise explanations
  - Dashboard and navigation: quick actions, searchable/filterable list, daily limit counter
  - Session rating: single 1–5 stars with optional comment

- Out of scope (MVP):
  - Progress analytics and learning history, TTS/pronunciation
  - Specialist modes (Business English, idioms, collocations, phrasal verbs)
  - Advanced test types (quizzes, gap-filling, MCQ)
  - Topic/domain tagging, set versioning, sharing
  - Advanced filters and sorting, data export/import
  - Offline mode
  - Multi-language pairs (MVP supports Polish → English only)

- Constraints:
  - Max 5 words per set
  - 10 generations per user per day
  - No multimedia handling and no external integrations in MVP

For detailed product requirements and success metrics, see [PRD](./.ai/prd.md) and [Tech Stack](./.ai/tech-stack.md).

## Project status

- Version: `0.0.1`
- Stage: MVP in development
- Performance goals (MVP): response time ≤ 30s for generation; uptime ≥ 99%
- Quality goals (MVP): sentence usefulness rating ≥ 4/5; checker accuracy ≥ 90%

## License

This project is currently unlicensed (all rights reserved). If you plan to use, modify, or distribute this code, please add an explicit `LICENSE` file and update this section accordingly.


