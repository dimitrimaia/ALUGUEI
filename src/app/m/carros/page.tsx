import { Building2, Car, ChevronRight, Megaphone, Plus, Search, Wallet } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { AbasMeusCarros } from "@/components/abas-meus-carros";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { BotaoLink, Placa, Selo, Vazio } from "@/components/ui";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { locadoraDoUsuario } from "@/lib/modos";
import { contratosDoMotorista } from "@/lib/motorista";
import { STATUS_CONTRATO, STATUS_VEICULO } from "@/lib/rotulos";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Meus carros" };

const cartao = "flex items-center gap-3 rounded-[1.1rem] border border-borda bg-cartao p-3.5 shadow-cartao transition-colors active:bg-cartao-2 hover:bg-cartao-2";

/** Os carros da pessoa nos dois papéis: os que ela alugou e os que ela anuncia. */
export default async function MeusCarros({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const aba = (await searchParams).aba === "anunciados" ? "anunciados" : "alugados";
  const usuario = await exigirUsuario("/m/carros");
  const admin = supabaseAdmin();

  return (
    <>
      <CabecalhoMotorista titulo="Meus carros" />
      <AbasMeusCarros atual={aba} />
      {aba === "alugados" ? <Alugados usuarioId={usuario.id} /> : <Anunciados usuarioId={usuario.id} admin={admin} />}
    </>
  );
}

async function Alugados({ usuarioId }: { usuarioId: string }) {
  const contratos = await contratosDoMotorista(usuarioId);
  if (!contratos.length) {
    return (
      <Vazio icone={Car} titulo="Nenhum carro alugado ainda" acao={<BotaoLink href="/m/buscar" icone={Search}>Buscar carros</BotaoLink>}>
        Quando você fechar um aluguel, o carro, o contrato e os pagamentos aparecem aqui.
      </Vazio>
    );
  }
  const admin = supabaseAdmin();
  const [{ data: veiculos }, { data: orgs }] = await Promise.all([
    admin.from("veiculos").select("id, placa, modelo").in("id", contratos.map((c) => c.veiculo_id)),
    admin.from("organizacoes").select("id, nome").in("id", contratos.map((c) => c.organizacao_id)),
  ]);
  return (
    <div className="flex flex-col gap-3">
      {contratos.map((c) => {
        const v = veiculos?.find((x) => x.id === c.veiculo_id);
        const comVoce = c.status === "ativo" || c.status === "assinado";
        return (
          <Link key={c.id} href={(comVoce ? "/m/carro" : `/m/contrato/${c.id}`) as Route} className={cartao}>
            {v && <Placa placa={v.placa} tamanho="sm" />}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{v?.modelo ?? "Carro"}</span>
              <span className="block truncate text-xs text-suave">{orgs?.find((o) => o.id === c.organizacao_id)?.nome}</span>
              <span className="mt-1 inline-flex"><Selo tom={STATUS_CONTRATO[c.status].tom}>{c.status === "ativo" ? "Com você" : STATUS_CONTRATO[c.status].rotulo}</Selo></span>
            </span>
            <ChevronRight size={17} className="shrink-0 text-suave" />
          </Link>
        );
      })}
      <Link href="/m/extrato" className={cartao}>
        <span className="grid size-9 place-items-center rounded-xl bg-marca-suave text-marca"><Wallet size={18} /></span>
        <span className="flex-1"><span className="block text-sm font-semibold">Pagamentos</span><span className="block text-xs text-suave">Extrato, Pix e comprovantes</span></span>
        <ChevronRight size={17} className="text-suave" />
      </Link>
    </div>
  );
}

async function Anunciados({ usuarioId, admin }: { usuarioId: string; admin: ReturnType<typeof supabaseAdmin> }) {
  const locadora = await locadoraDoUsuario(usuarioId);
  if (!locadora) {
    return (
      <Vazio icone={Building2} titulo="Tem um carro parado?" acao={<BotaoLink href="/painel/comecar" icone={Plus}>Anunciar meu carro</BotaoLink>}>
        Ative o modo locador e alugue o seu carro para motoristas de app, com contrato, vistoria e Pix toda semana. Você continua podendo alugar carros por aqui.
      </Vazio>
    );
  }
  const [{ data: veiculos }, { data: anuncios }] = await Promise.all([
    admin.from("veiculos").select("id, placa, modelo, status").eq("organizacao_id", locadora.id).order("criado_em", { ascending: false }),
    admin.from("anuncios").select("veiculo_id, status, aluguel_semanal_centavos").eq("organizacao_id", locadora.id),
  ]);
  return (
    <div className="flex flex-col gap-3">
      {!veiculos?.length && <Vazio icone={Car} titulo="Nenhum carro cadastrado">Cadastre o primeiro carro da sua locadora.</Vazio>}
      {veiculos?.map((v) => {
        const a = anuncios?.find((x) => x.veiculo_id === v.id);
        return (
          <Link key={v.id} href={`/painel/veiculos/${v.id}` as Route} className={cartao}>
            <Placa placa={v.placa} tamanho="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{v.modelo}</span>
              <span className="mt-1 flex flex-wrap items-center gap-1.5">
                <Selo tom={STATUS_VEICULO[v.status].tom}>{STATUS_VEICULO[v.status].rotulo}</Selo>
                {a?.status === "ativo" && <span className="inline-flex items-center gap-1 text-xs text-suave"><Megaphone size={12} /> Anunciado · {formatarBRL(a.aluguel_semanal_centavos)}/sem</span>}
              </span>
            </span>
            <ChevronRight size={17} className="shrink-0 text-suave" />
          </Link>
        );
      })}
      <div className="grid grid-cols-2 gap-2">
        <BotaoLink href="/painel/veiculos/novo" variante="secundario" icone={Plus}>Cadastrar carro</BotaoLink>
        <BotaoLink href="/painel" icone={Building2}>Modo locador</BotaoLink>
      </div>
      <p className="text-center text-xs text-suave">{locadora.nome}: contratos, cobranças e motoristas ficam no modo locador.</p>
    </div>
  );
}
