import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`.
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      // lcov is what SonarQube consumes; text keeps the CI log readable.
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      // Floors set just below the current numbers, so an uncovered addition
      // fails locally instead of first showing up as a red Quality Gate.
      thresholds: {
        statements: 90,
        lines: 90,
        functions: 85,
        branches: 70,
      },
      include: ['src/**/*.ts'],
      exclude: [
        // Specs themselves.
        'src/**/*.spec.ts',
        // Bootstrap and DI wiring: no branching logic to cover.
        'src/main.ts',
        'src/**/*.module.ts',
        // Interfaces and abstract contracts: no executable statements.
        'src/**/*.entity.ts',
        'src/**/domain/*.repository.ts',
        'src/shared/domain/**',
        // Adapters that only make sense against a real database.
        // They are exercised by the e2e suite, not by unit tests.
        'src/**/infrastructure/**',
        'src/shared/database/**',
      ],
    },
  },
});
