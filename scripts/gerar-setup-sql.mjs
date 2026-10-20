// Junta as migrações do Drizzle e o supabase/rls.sql em um único supabase/setup.sql,
// para colar no SQL Editor do Supabase quando não há conexão direta com o banco.
// Registra as migrações em drizzle.__drizzle_migrations, como o drizzle-kit faria,
// para que um `pnpm db:migrate` futuro não tente reaplicá-las.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
const partes = [
  "-- Gerado por scripts/gerar-setup-sql.mjs. Não edite à mão.",
  "begin;",
  "create schema if not exists drizzle;",
  "create table if not exists drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint);",
];

for (const entrada of journal.entries) {
  const sql = readFileSync(`drizzle/${entrada.tag}.sql`, "utf8");
  const hash = createHash("sha256").update(sql).digest("hex");
  const corpo = sql.replaceAll("--> statement-breakpoint", "");
  const registro = `insert into drizzle.__drizzle_migrations (hash, created_at) values ('${hash}', ${entrada.when});`;
  partes.push(`\n-- Migração ${entrada.tag}`, corpo, registro);

  // Arquivo avulso por migração, para aplicar só o que falta num banco já criado.
  mkdirSync("supabase/migracoes", { recursive: true });
  writeFileSync(
    `supabase/migracoes/${entrada.tag}.sql`,
    [`-- Migração ${entrada.tag}. Gerado por scripts/gerar-setup-sql.mjs.`, "begin;", corpo, registro, "commit;\n"].join("\n"),
  );
}

partes.push("\n-- Políticas de acesso (supabase/rls.sql)", readFileSync("supabase/rls.sql", "utf8"), "commit;\n");
writeFileSync("supabase/setup.sql", partes.join("\n"));
console.log("supabase/setup.sql e supabase/migracoes/ gerados");
