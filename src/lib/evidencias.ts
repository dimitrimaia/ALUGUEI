import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { supabaseAdmin } from "./supabase/admin";

const TIPOS_ACEITOS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/json": "json", // aceites e registros gerados pelo sistema
};
const TAMANHO_MAXIMO = 8 * 1024 * 1024;

export class ArquivoInvalido extends Error {}

/**
 * Guarda um arquivo no cofre de provas (RNF-010): hash SHA-256, hora do
 * servidor, IP e dispositivo. O mesmo arquivo enviado duas vezes vira um só.
 */
export async function guardarEvidencia(arquivo: File | Blob, dados: {
  organizacaoId: string;
  enviadoPor: string;
  finalidade: string;
  /** foto | video | pdf | aceite. Sem valor, é deduzido do tipo do arquivo. */
  tipo?: string;
  locatarioId?: string;
  contratoId?: string;
  veiculoId?: string;
  latitude?: number;
  longitude?: number;
  capturadoEm?: Date;
}): Promise<{ id: string; sha256: string; caminho: string }> {
  const extensao = TIPOS_ACEITOS[arquivo.type];
  if (!extensao) throw new ArquivoInvalido("Envie uma foto (JPG, PNG) ou PDF.");
  if (arquivo.size > TAMANHO_MAXIMO) throw new ArquivoInvalido("Arquivo maior que 8 MB.");

  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const admin = supabaseAdmin();

  const { data: existente } = await admin
    .from("evidencias")
    .select("id")
    .eq("organizacao_id", dados.organizacaoId)
    .eq("finalidade", dados.finalidade)
    .eq("sha256", sha256)
    .maybeSingle();
  const caminho = `${dados.organizacaoId}/${dados.finalidade.replaceAll(".", "/")}/${sha256}.${extensao}`;
  if (existente) return { id: existente.id, sha256, caminho };

  const { error: erroUpload } = await admin.storage.from("evidencias").upload(caminho, bytes, { contentType: arquivo.type, upsert: false });
  if (erroUpload && !/exists|duplicate/i.test(erroUpload.message)) throw new Error(`Falha no upload: ${erroUpload.message}`);

  const h = await headers();
  const { data, error } = await admin
    .from("evidencias")
    .insert({
      organizacao_id: dados.organizacaoId,
      locatario_id: dados.locatarioId ?? null,
      contrato_id: dados.contratoId ?? null,
      veiculo_id: dados.veiculoId ?? null,
      tipo: dados.tipo ?? (arquivo.type === "application/pdf" ? "pdf" : "foto"),
      finalidade: dados.finalidade,
      caminho_storage: caminho,
      sha256,
      tamanho_bytes: arquivo.size,
      mime: arquivo.type,
      capturado_em_dispositivo: dados.capturadoEm?.toISOString() ?? null,
      latitude: dados.latitude ?? null,
      longitude: dados.longitude ?? null,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      dispositivo: h.get("user-agent"),
      enviado_por: dados.enviadoPor,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Falha ao registrar evidência: ${error?.message}`);
  return { id: data.id, sha256, caminho };
}

/** Link temporário (10 min) para abrir um arquivo do cofre. Chame só depois de checar o acesso. */
export async function linkTemporario(caminho: string): Promise<string | null> {
  const { data } = await supabaseAdmin().storage.from("evidencias").createSignedUrl(caminho, 600);
  return data?.signedUrl ?? null;
}
