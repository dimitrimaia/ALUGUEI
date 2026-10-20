import "server-only";
import { MODELO_BASE, NOME_MODELO_BASE } from "@/dominio/contrato/modelo-base";
import { PARAMETROS_CONTRATO_REFERENCIA } from "@/dominio/contrato/parametros";
import { supabaseAdmin } from "./supabase/admin";

/**
 * Versão vigente do modelo-base. A versão é o conteúdo: se o texto do modelo
 * mudou no código, nasce uma versão nova; contratos antigos seguem ligados à
 * versão com que foram assinados (RF-033).
 */
export async function versaoVigenteModeloBase() {
  const admin = supabaseAdmin();
  let { data: modelo } = await admin.from("modelos_contrato").select("id").is("organizacao_id", null).eq("nome", NOME_MODELO_BASE).maybeSingle();
  if (!modelo) {
    const { data, error } = await admin.from("modelos_contrato").insert({ nome: NOME_MODELO_BASE }).select("id").single();
    if (error || !data) throw new Error(`Falha ao criar modelo-base: ${error?.message}`);
    modelo = data;
  }

  const { data: versoes } = await admin
    .from("versoes_modelo")
    .select("id, versao, corpo, revisado_por_advogado_em")
    .eq("modelo_id", modelo.id)
    .order("versao", { ascending: false });
  const igual = versoes?.find((v) => v.corpo === MODELO_BASE);
  if (igual) return igual;

  const { data: nova, error } = await admin
    .from("versoes_modelo")
    .insert({
      modelo_id: modelo.id,
      versao: (versoes?.[0]?.versao ?? 0) + 1,
      corpo: MODELO_BASE,
      parametros_padrao: JSON.parse(JSON.stringify(PARAMETROS_CONTRATO_REFERENCIA)),
      publicado_em: new Date().toISOString(),
    })
    .select("id, versao, corpo, revisado_por_advogado_em")
    .single();
  if (error || !nova) throw new Error(`Falha ao criar versão do modelo: ${error?.message}`);
  return nova;
}
