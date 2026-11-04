// Copia todos os buckets e arquivos do Supabase Storage de um projeto para outro
// (migração de região). Uso: ORIGEM_URL, ORIGEM_CHAVE, DESTINO_URL, DESTINO_CHAVE
// (chaves secretas, sb_secret_...) e `node scripts/copiar-storage.mjs`.
// Pode rodar de novo sem duplicar: o que já existe no destino é sobrescrito.
import { createClient } from "@supabase/supabase-js";

const { ORIGEM_URL, ORIGEM_CHAVE, DESTINO_URL, DESTINO_CHAVE } = process.env;
if (!ORIGEM_URL || !ORIGEM_CHAVE || !DESTINO_URL || !DESTINO_CHAVE) {
  console.error("Faltam ORIGEM_URL, ORIGEM_CHAVE, DESTINO_URL ou DESTINO_CHAVE.");
  process.exit(1);
}
const sem = { auth: { persistSession: false } };
const origem = createClient(ORIGEM_URL, ORIGEM_CHAVE, sem);
const destino = createClient(DESTINO_URL, DESTINO_CHAVE, sem);

/** Todos os caminhos de arquivo de um bucket (as "pastas" são prefixos). */
async function listar(bucket, prefixo = "") {
  const caminhos = [];
  for (let pagina = 0; ; pagina++) {
    const { data, error } = await origem.storage.from(bucket).list(prefixo, { limit: 1000, offset: pagina * 1000 });
    if (error) throw error;
    for (const item of data) {
      const caminho = prefixo ? `${prefixo}/${item.name}` : item.name;
      // Sem id é pasta: entra nela.
      if (item.id === null) caminhos.push(...(await listar(bucket, caminho)));
      else caminhos.push({ caminho, tipo: item.metadata?.mimetype });
    }
    if (data.length < 1000) break;
  }
  return caminhos;
}

const { data: buckets, error } = await origem.storage.listBuckets();
if (error) throw error;
let total = 0;
let falhas = 0;
for (const b of buckets) {
  const { error: e } = await destino.storage.createBucket(b.id, { public: b.public, fileSizeLimit: b.file_size_limit ?? undefined, allowedMimeTypes: b.allowed_mime_types ?? undefined });
  if (e && !/already exists|duplicate/i.test(e.message)) throw e;
  const arquivos = await listar(b.id);
  console.log(`Bucket ${b.id}: ${arquivos.length} arquivos`);
  for (const { caminho, tipo } of arquivos) {
    const { data: blob, error: e1 } = await origem.storage.from(b.id).download(caminho);
    if (e1) { falhas++; console.error(`  falhou baixar ${caminho}: ${e1.message}`); continue; }
    const { error: e2 } = await destino.storage.from(b.id).upload(caminho, blob, { upsert: true, contentType: tipo });
    if (e2) { falhas++; console.error(`  falhou enviar ${caminho}: ${e2.message}`); continue; }
    total++;
  }
}
console.log(`Pronto: ${total} arquivos copiados, ${falhas} falhas.`);
if (falhas) process.exit(1);
