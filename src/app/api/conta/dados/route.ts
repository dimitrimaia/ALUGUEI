import { NextResponse } from "next/server";
import { perfilDaConta } from "@/lib/conta";
import { cadastrosDoMotorista, contratosDoMotorista } from "@/lib/motorista";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** LGPD, direito de acesso (RNF-004): os dados pessoais da conta num arquivo JSON. */
export async function GET() {
  const perfil = await perfilDaConta();
  if (!perfil) return NextResponse.json({ erro: "Entre na conta para baixar seus dados." }, { status: 401 });
  const admin = supabaseAdmin();
  const [cadastros, contratos, { data: conversas }, { data: membros }] = await Promise.all([
    cadastrosDoMotorista(perfil.id),
    contratosDoMotorista(perfil.id),
    admin.from("conversas").select("id, anuncio_id, nome_motorista, telefone_motorista, criado_em").eq("usuario_id", perfil.id),
    admin.from("membros").select("organizacao_id, papel, criado_em").eq("usuario_id", perfil.id),
  ]);
  const idsConversas = (conversas ?? []).map((c) => c.id);
  const idsCadastros = cadastros.map((c) => c.id);
  const [{ data: mensagens }, { data: consentimentos }] = await Promise.all([
    idsConversas.length ? admin.from("mensagens").select("conversa_id, autor, texto, criado_em").in("conversa_id", idsConversas).order("criado_em") : Promise.resolve({ data: [] }),
    idsCadastros.length ? admin.from("consentimentos").select("finalidade, versao_texto, aceito_em, revogado_em").in("locatario_id", idsCadastros) : Promise.resolve({ data: [] }),
  ]);

  const corpo = {
    geradoEm: new Date().toISOString(),
    conta: { id: perfil.id, nome: perfil.nome, email: perfil.email, celular: perfil.telefone, criadaEm: perfil.criadoEm, preferencias: perfil.preferencias },
    equipesDeLocador: membros ?? [],
    cadastrosComoMotorista: cadastros,
    contratos,
    consentimentos: consentimentos ?? [],
    conversas: (conversas ?? []).map((c) => ({ ...c, mensagens: (mensagens ?? []).filter((m) => m.conversa_id === c.id) })),
  };
  return new NextResponse(JSON.stringify(corpo, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="aluguei-meus-dados.json"`,
      "cache-control": "no-store",
    },
  });
}
