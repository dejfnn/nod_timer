# CLAUDE.md

## Language
- Communicate with the user in Czech
- Write all code, commits, and code comments in English

## Work Style
- Make changes autonomously without asking for confirmation
- If you're confident in a solution, implement it directly
- If there are multiple approaches, briefly explain the tradeoff and pick the better one
- Don't write long explanations before each change — just do it

## Before Every Change
- Read relevant files before editing them
- Preserve existing code style (formatting, naming conventions)
- Don't delete existing functionality unless explicitly told to

## Git
- Don't push to remote without user confirmation
- Write commit messages in English, concise, imperative mood (e.g., "Add timer screen with start/stop logic")

## Tech Stack
- TypeScript 5+ (strict mode)
- Expo SDK 55+ with Expo Router
- React Native with NativeWind (Tailwind CSS)
- expo-sqlite + Drizzle ORM for database
- Zustand for state management
- Victory Native for charts
- Jest + @testing-library/react-native for testing

## Conventions
- Use functional components with hooks
- Prefer `const` arrow functions for components
- Use path aliases: `@/` maps to `src/`
- Database functions take `db` as first parameter
- Use Drizzle's type inference (`InferSelectModel`, `InferInsertModel`)
- NativeWind className for styling (avoid inline styles)
- File naming: kebab-case for routes, PascalCase for components

## Testing
- Run tests after every major change and fix failures
- Test command: `npx jest --verbose`
- Use @testing-library/react-native for component tests
- Mock expo-sqlite for model tests
