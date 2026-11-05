import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/teste/server-only-vazio.ts", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    // Regras de data dependem do fuso; os testes rodam no fuso de produção.
    env: { TZ: "America/Sao_Paulo" },
  },
});
