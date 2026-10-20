import { CalendarRange, ChevronRight, ClipboardCheck, FileText, Gauge, MapPin, Wrench } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { Cartao, DadoRotulado, Placa, Selo, Vazio } from "@/components/ui";
import type { ParametrosContrato } from "@/dominio/contrato/parametros";
import { data, formatarData } from "@/dominio/datas/data";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { combustivelPorExtenso } from "@/dominio/vistoria/roteiro";
import { contratosDoMotorista } from "@/lib/motorista";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";

const km = new Intl.NumberFormat("pt-BR");

/** O carro que está com o motorista: dados, km, regras de uso e atalhos. */
export default async function MeuCarro() {
  const usuario = await exigirUsuario("/m/carro");
  const contrato = (await contratosDoMotorista(usuario.id)).find((c) => ["ativo", "assinado"].includes(c.status));
  if (!contrato) {
    return (
      <div className="flex flex-col gap-4">
        <CabecalhoMotorista titulo="Meu carro" />
        <Vazio titulo="Nenhum carro com você">Quando o contrato for assinado e a vistoria confirmada, o carro aparece aqui.</Vazio>
      </div>
    );
  }
  const admin = supabaseAdmin();
  const [{ data: v }, { data: org }, { data: vistoria }, { data: leituras }] = await Promise.all([
    admin.from("veiculos").select("*").eq("id", contrato.veiculo_id).single(),
    admin.from("organizacoes").select("nome, cidade, uf").eq("id", contrato.organizacao_id).single(),
    admin.from("vistorias").select("id, odometro, combustivel_oitavos, realizada_em").eq("contrato_id", contrato.id).eq("tipo", "entrega").maybeSingle(),
    admin.from("leituras_odometro").select("km, lido_em, origem").eq("veiculo_id", contrato.veiculo_id).order("lido_em", { ascending: false }).order("criado_em", { ascending: false }).limit(5),
  ]);
  if (!v) return null;
  const p = contrato.parametros as unknown as ParametrosContrato;
  const kmAtual = v.odometro_atual;
  const rodados = vistoria ? kmAtual - vistoria.odometro : 0;
  const proximaRevisao = Math.ceil((kmAtual + 1) / p.manutencao.revisaoACadaKm) * p.manutencao.revisaoACadaKm;

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoMotorista titulo="Meu carro" />

      <Cartao className="flex flex-col items-center gap-3 py-6 text-center">
        <Placa placa={v.placa} tamanho="lg" />
        <div>
          <p className="text-lg font-extrabold">{v.modelo}</p>
          <p className="text-sm text-suave">{[v.ano_fabricacao && v.ano_modelo ? `${v.ano_fabricacao}/${v.ano_modelo}` : v.ano_modelo, v.cor].filter(Boolean).join(" · ")}</p>
        </div>
        <Selo tom={contrato.status === "ativo" ? "ok" : "neutro"}>{contrato.status === "ativo" ? "Com você" : "Aguardando a vistoria"}</Selo>
      </Cartao>

      <div className="grid grid-cols-2 gap-3">
        <Cartao>
          <Gauge size={18} className="text-marca" />
          <p className="mt-2 text-xs text-suave">Km atual</p>
          <p className="text-lg font-extrabold tabular-nums">{km.format(kmAtual)}</p>
          {vistoria && <p className="text-[0.7rem] text-suave">{km.format(rodados)} km desde a retirada</p>}
        </Cartao>
        <Cartao>
          <Wrench size={18} className="text-marca" />
          <p className="mt-2 text-xs text-suave">Próxima revisão</p>
          <p className="text-lg font-extrabold tabular-nums">{km.format(proximaRevisao)}</p>
          <p className="text-[0.7rem] text-suave">faltam {km.format(proximaRevisao - kmAtual)} km</p>
        </Cartao>
      </div>

      <Cartao>
        <p className="mb-1 text-sm font-bold">Regras de uso</p>
        <dl className="divide-y divide-borda">
          <DadoRotulado rotulo="Franquia">{km.format(p.km.franquiaMensal)} km/mês</DadoRotulado>
          <DadoRotulado rotulo="Km excedente">{formatarBRL(p.km.valorExcedente)} por km</DadoRotulado>
          <DadoRotulado rotulo="Área permitida">{p.areaCirculacao}</DadoRotulado>
          <DadoRotulado rotulo="Revisão">a cada {km.format(p.manutencao.revisaoACadaKm)} km</DadoRotulado>
          {vistoria && <DadoRotulado rotulo="Combustível na retirada">{combustivelPorExtenso(vistoria.combustivel_oitavos)}</DadoRotulado>}
          <DadoRotulado rotulo="Contrato">{formatarData(p.inicio)} a {formatarData(p.fim)}</DadoRotulado>
          <DadoRotulado rotulo="Locador">{org?.nome}</DadoRotulado>
        </dl>
      </Cartao>

      <div className="divide-y divide-borda overflow-hidden rounded-[1.1rem] border border-borda bg-cartao shadow-cartao">
        {[
          { href: `/m/contrato/${contrato.id}`, icone: FileText, titulo: "Contrato", detalhe: "Resumo e PDF completo" },
          vistoria && { href: `/m/vistoria/${vistoria.id}`, icone: ClipboardCheck, titulo: "Vistoria de entrega", detalhe: `Feita em ${new Date(vistoria.realizada_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}` },
        ]
          .filter((x): x is { href: string; icone: typeof FileText; titulo: string; detalhe: string } => Boolean(x))
          .map(({ href, icone: Icone, titulo, detalhe }) => (
            <Link key={href} href={href as Route} className="flex items-center gap-3 px-4 py-3 hover:bg-cartao-2">
              <span className="grid size-9 place-items-center rounded-lg bg-marca-suave text-marca"><Icone size={18} /></span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">{titulo}</span>
                <span className="block text-xs text-suave">{detalhe}</span>
              </span>
              <ChevronRight size={18} className="text-suave" />
            </Link>
          ))}
      </div>

      {!!leituras?.length && (
        <Cartao>
          <p className="mb-2 text-sm font-bold">Últimas leituras de km</p>
          <ul className="divide-y divide-borda text-sm">
            {leituras.map((l, i) => (
              <li key={i} className="flex justify-between py-2">
                <span className="text-suave">{formatarData(data(l.lido_em))}</span>
                <span className="font-semibold tabular-nums">{km.format(l.km)} km</span>
              </li>
            ))}
          </ul>
        </Cartao>
      )}
      <p className="flex items-center justify-center gap-1.5 text-xs text-suave"><MapPin size={14} /> {org?.cidade}/{org?.uf} <CalendarRange size={14} className="ml-2" /> Contrato até {formatarData(p.fim)}</p>
    </div>
  );
}
