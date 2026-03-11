import { defineWorkspace } from 'vitest/config'
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineWorkspace([
  {
    test: {
      name: 'server',
      environment: 'node',
      include: ['server/**/*.test.ts', 'server/**/*.spec.ts'],
      alias: {
        "@": path.resolve(templateRoot, "client", "src"),
        "@shared": path.resolve(templateRoot, "shared"),
        "@assets": path.resolve(templateRoot, "attached_assets"),
      },
    },
  },
  {
    test: {
      name: 'client',
      environment: 'jsdom',
      include: ['client/**/*.test.ts', 'client/**/*.spec.ts'],
      setupFiles: ['./client/src/setupTests.ts'],
      globals: true,
      alias: {
        "@": path.resolve(templateRoot, "client", "src"),
        "@shared": path.resolve(templateRoot, "shared"),
        "@assets": path.resolve(templateRoot, "attached_assets"),
      },
    },
  }
])
