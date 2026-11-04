import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { Numero, TituloAdmin } from "@/components/admin/ui";
import { hoje } from "@/dominio/datas/data";
import { listarUsuarios } from "@/lib/admin-usuarios";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata = { title: "Visão geral" };

/** Números da plataforma e o que precisa de atenção da equipe. */
export default async function VisaoGeral() {
  const admin = supabaseAdmin();
  const dia = hoje();
  const inicioMes = `${dia.slice(0, 8)}01T00:00:00-03:00`;
  const seteDias = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const umDia = new Date(Date.now() - 86_400_000).toISOString();
  const contar = (t: string) => admin.from(t as "organizacoes").select("id", { count: "exact", head: true });
  const [usuarios, { count: locadoras }, { count: carros }, { count: ativos }, { data: abertas }, { data: pagas }, { count: copiloto }, { count: ofertas7 }, { count: erros24 }, { count: suporte }, { count: verificar }, { count: acoes }, { count: anuncios }] = await Promise.all([
    listarUsuarios(),
    contar("organizacoes"),
    contar("veiculos"),
    admin.from("contratos").select("id", { count: "exact", head: true }).eq("status", "ativo"),
    admin.from("cobrancas").select("valor_centavos, vencimento, status").in("status", ["emitida", "vencida"]).limit(5000),
    admin.from("cobrancas").select("valor_pago_centavos, split_plataforma_centavos").gte("pago_em", inicioMes).limit(5000),
    // perfis_custo não tem "id" (a chave é o usuário).
    admin.from("perfis_custo").select("usuario_id", { count: "exact", head: true }),
    admin.from("corridas_avaliadas").select("id", { count: "exact", head: true }).gte("ocorrida_em", seteDias),
    admin.from("erros_app").select("id", { count: "exact", head: true }).gte("criado_em", umDia),
    admin.from("atendimentos").select("id", { count: "exact", head: true }).eq("status", "aberto"),
    admin.from("veiculos").select("id", { count: "exact", head: true }).eq("verificacao", "em_analise"),
    admin.from("acoes_pendentes").select("id", { count: "exact", head: true }).eq("status", "pendente"),
    admin.from("anuncios").select("id", { count: "exact", head: true }).eq("status", "ativo"),
  ]);
  const novos7 = usuarios.filter((u) => u.criadoEm >= seteDias).length;
  const ativos7 = usuarios.filter((u) => (u.ultimoLogin ?? "") >= seteDias).length;
  const vencidas = (abertas ?? []).filter((c) => c.vencimento < dia);
  const recebido = (pagas ?? []).reduce((s, c) => s + (c.valor_pago_centavos ?? 0), 0);
  const plataforma = (pagas ?? []).reduce((s, c) => s + (c.split_plataforma_centavos ?? 0), 0);
  return (
    <main className="mx-auto max-w-6xl">
      <TituloAdmin titulo="Visão geral" subtitulo="Como está a plataforma agora" />
      <h2 className="mb-2 text-sm font-bold text-suave">Atenção da equipe</h2>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Numero rotulo="Carros para verificar" valor={verificar ?? 0} href="/admin/verificacoes" tom={verificar ? "alerta" : "neutro"} />
        <Numero rotulo="Suporte esperando" valor={suporte ?? 0} href="/admin/suporte" tom={suporte ? "alerta" : "neutro"} />
        <Numero rotulo="Cobranças vencidas" valor={vencidas.length} detalhe={formatarBRL(vencidas.reduce((s, c) => s + c.valor_centavos, 0))} href="/admin/cobrancas?status=vencida" tom={vencidas.length ? "perigo" : "neutro"} />
        <Numero rotulo="Erros nas últimas 24 h" valor={erros24 ?? 0} href="/admin/erros" tom={(erros24 ?? 0) > 20 ? "perigo" : erros24 ? "alerta" : "neutro"} />
      </div>
      <h2 className="mb-2 text-sm font-bold text-suave">Pessoas</h2>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Numero rotulo="Contas" valor={usuarios.length} detalhe={`+${novos7} nos últimos 7 dias`} href="/admin/usuarios" />
        <Numero rotulo="Entraram em 7 dias" valor={ativos7} />
        <Numero rotulo="Usam o Copiloto" valor={copiloto ?? 0} detalhe={`${(ofertas7 ?? 0).toLocaleString("pt-BR")} ofertas lidas em 7 dias`} />
        <Numero rotulo="Locadoras" valor={locadoras ?? 0} href="/admin/locadoras" />
      </div>
      <h2 className="mb-2 text-sm font-bold text-suave">Negócio</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Numero rotulo="Carros cadastrados" valor={carros ?? 0} detalhe={`${anuncios ?? 0} anúncios ativos`} href="/admin/carros" />
        <Numero rotulo="Contratos ativos" valor={ativos ?? 0} href="/admin/contratos?status=ativo" />
        <Numero rotulo="Recebido no mês" valor={formatarBRL(recebido)} detalhe={`${formatarBRL(plataforma)} para a plataforma`} href="/admin/cobrancas?status=paga" tom="ok" />
        <Numero rotulo="Ações pendentes" valor={acoes ?? 0} detalhe="decisões dos locadores" href="/admin/acoes" />
      </div>
    </main>
  );
}
