"use client";

import { Bell, Car, ChevronDown, ChevronRight, CircleDollarSign, FileText, Globe, Home, Landmark, LayoutDashboard, LifeBuoy, LogOut, Megaphone, MessageCircle, Plus, Settings, UserPlus, Users, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useConta } from "@/components/conta/contexto";
import { BarraInferior, BarraTopo, BotaoCentral } from "@/components/app/barras";
import { BarraLateral, FolhaAcoes, TopoDesktop } from "@/components/app/casca-desktop";
import { useMenu } from "@/components/menu-app";
import { Avatar, Marca } from "@/components/ui";

const GESTAO = [
  { href: "/painel/veiculos", rotulo: "Veículos", icone: Car },
  { href: "/painel/motoristas", rotulo: "Motoristas", icone: Users },
  { href: "/painel/contratos", rotulo: "Contratos", icone: FileText },
] as const;
const BUSCA = [
  { href: "/painel/anuncios", rotulo: "Anúncios", icone: Megaphone },
  { href: "/painel/conversas", rotulo: "Conversas", icone: MessageCircle },
] as const;
const DINHEIRO = [
  { href: "/painel/financeiro", rotulo: "Financeiro", icone: CircleDollarSign },
  { href: "/painel/recebimentos", rotulo: "Recebimentos", icone: Landmark },
] as const;

const ACOES = [
  { href: "/painel/veiculos/novo", rotulo: "Cadastrar veículo", detalhe: "Placa, modelo e km", icone: Car },
  { href: "/painel/anuncios", rotulo: "Anunciar um carro", detalhe: "Aparece na busca de motoristas", icone: Megaphone },
  { href: "/painel/motoristas/convidar", rotulo: "Cadastrar motorista", detalhe: "Para quem você já conhece: link no WhatsApp", icone: UserPlus },
] as const;

function ativo(caminho: string, href: string) {
  return href === "/painel" ? caminho === href : caminho === href || caminho.startsWith(`${href}/`);
}

function Contador({ n }: { n: number }) {
  if (!n) return null;
  return <span className="grid min-w-5 place-items-center rounded-full bg-[#ffb020] px-1.5 text-[0.7rem] font-bold text-[#3a2500]">{n}</span>;
}

/** Barra lateral escura no computador; cabeçalho, abas inferiores e botão de ação no celular. */
export function NavegacaoPainel({
  organizacao,
  pendentes,
  recebimentosAtivos,
}: {
  organizacao: string;
  pendentes: number;
  recebimentosAtivos: boolean;
}) {
  const caminho = usePathname();
  const { perfil, naoLidas, locadora, notificacoes } = useConta();
  const [acoesAbertas, setAcoesAbertas] = useState(false);
  useMenu({
    modo: "locador",
    locadora,
    inicio: "/painel",
    conta: "/painel/conta",
    perfil: { ...perfil, detalhe: organizacao },
    secoes: [
      { titulo: "Gestão", itens: GESTAO.map((i) => ({ ...i, contador: i.href === "/painel/motoristas" ? pendentes : 0 })) },
      { titulo: "Busca de carros", itens: BUSCA.map((i) => ({ ...i, contador: i.href === "/painel/conversas" ? naoLidas : 0 })) },
      { titulo: "Dinheiro", itens: DINHEIRO },
      {
        titulo: "Ajuda",
        itens: [
          { href: "/painel/avisos", rotulo: "Avisos", icone: Bell, contador: notificacoes },
          { href: "/painel/suporte", rotulo: "Falar com o suporte", icone: LifeBuoy },
        ],
      },
    ],
  });

  return (
    <>
      {/* Computador: a mesma lateral e a mesma barra de cima do modo motorista. */}
      <BarraLateral
        inicio="/painel"
        conta="/painel/conta"
        detalhe={organizacao}
        secoes={[
          { titulo: "", itens: [{ href: "/painel", rotulo: "Início", icone: Home }] },
          { titulo: "Gestão", itens: GESTAO.map((i) => ({ ...i, contador: i.href === "/painel/motoristas" ? pendentes : 0 })) },
          { titulo: "Busca de carros", itens: BUSCA.map((i) => ({ ...i, contador: i.href === "/painel/conversas" ? naoLidas : 0 })) },
          { titulo: "Dinheiro", itens: DINHEIRO },
        ]}
        destaque={
          recebimentosAtivos ? (
            <div className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
              <p className="flex items-center gap-2 text-sm font-semibold"><span className="size-2 rounded-full bg-[#4ade80]" /> Recebendo no Pix</p>
              <p className="mt-1 text-xs leading-relaxed text-white/60">Os aluguéis caem direto na sua conta Asaas.</p>
            </div>
          ) : (
            <Link href="/painel/recebimentos" className="block rounded-2xl bg-gradient-to-br from-[#1f56e8] to-[#0d3aa8] p-4 ring-1 ring-white/10 hover:brightness-110">
              <p className="text-sm font-semibold">Ative os recebimentos</p>
              <p className="mt-1 text-xs leading-relaxed text-white/75">Sem isso, o motorista não consegue pagar pelo Pix. Leva 2 minutos.</p>
            </Link>
          )
        }
      />
      <TopoDesktop conta="/painel/conta" acao={{ rotulo: "Novo", icone: Plus, acoes: ACOES }} />

      {/* Celular: o mesmo cabeçalho e o mesmo rodapé do modo motorista, com as abas do locador. */}
      <BarraTopo className="lg:hidden" />
      <BarraInferior
        abas={[
          { href: "/painel", rotulo: "Início", icone: Home, ativo: (c) => c === "/painel" },
          { href: "/painel/veiculos", rotulo: "Frota", icone: Car, ativo: (c) => c.startsWith("/painel/veiculos") },
          { href: "/painel/financeiro", rotulo: "Financeiro", icone: CircleDollarSign, ativo: (c) => c.startsWith("/painel/financeiro") },
        ]}
        central={<BotaoCentral aoTocar={() => setAcoesAbertas(true)} icone={Plus} rotulo="Novo" />}
      />

      <FolhaAcoes aberta={acoesAbertas} aoFechar={() => setAcoesAbertas(false)} titulo="O que você quer fazer?" acoes={ACOES} />
    </>
  );
}
