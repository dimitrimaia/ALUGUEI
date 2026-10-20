import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não configurada");

// prepare: false é exigido pelo pooler do Supabase em modo transação.
export const db = drizzle(postgres(url, { prepare: false }), { schema });
