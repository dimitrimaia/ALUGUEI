// Gera src/db/tipos.ts (formato de tipos do supabase-js) a partir do schema Drizzle.
// O schema Drizzle é a fonte da verdade; rode `pnpm db:tipos` depois de alterá-lo.
import { writeFileSync } from "node:fs";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import * as schema from "../src/db/schema";

function tipoTs(coluna: { dataType: string; enumValues?: readonly string[] }): string {
  if (coluna.enumValues?.length) return coluna.enumValues.map((v) => JSON.stringify(v)).join(" | ");
  switch (coluna.dataType) {
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "json":
      return "Json";
    default:
      return "string"; // text, uuid, date e timestamp chegam como string pela API
  }
}

const tabelas: string[] = [];
for (const valor of Object.values(schema)) {
  if (!(valor instanceof PgTable)) continue;
  const { name, columns } = getTableConfig(valor);
  const row = columns.map((c) => `${c.name}: ${tipoTs(c)}${c.notNull ? "" : " | null"}`);
  const insert = columns.map((c) => {
    const opcional = !c.notNull || c.hasDefault;
    return `${c.name}${opcional ? "?" : ""}: ${tipoTs(c)}${c.notNull ? "" : " | null"}`;
  });
  const update = columns.map((c) => `${c.name}?: ${tipoTs(c)}${c.notNull ? "" : " | null"}`);
  tabelas.push(`      ${name}: {
        Row: { ${row.join("; ")} };
        Insert: { ${insert.join("; ")} };
        Update: { ${update.join("; ")} };
        Relationships: [];
      };`);
}

const saida = `// Gerado por scripts/gerar-tipos.ts. Não edite à mão.
export type Json = string | number | boolean | null | { [k: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
${tabelas.sort().join("\n")}
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Linha<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
`;
writeFileSync("src/db/tipos.ts", saida);
console.log("src/db/tipos.ts gerado");
