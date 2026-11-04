import { Send, AlertTriangle, BadgeCheck, Building2, Car, FileSignature, Gauge, LifeBuoy, Megaphone, ScrollText, ShieldAlert, Users, Wallet } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Marca } from "@/components/ui";
import { exigirEquipeAluguei } from "@/lib/equipe-aluguei";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata = { title: { template: "%s · Admin Aluguei", default: "Admin Aluguei" }, robots: { index: false } };

/**
 * Painel da equipe do Aluguei. Só para os e-mails da variável ADMINS: para os
 * outros a página não existe (404). Toda ação do painel vai para a auditoria.
 */
export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const usuario = await exigirEquipeAluguei();
  const admin = supabaseAdmin();
  const [{ count: verificar }, { count: suporte }, { count: acoes }] = await Promise.all([
    admin.from("veiculos").select("id", { count: "exact", head: true }).eq("verificacao", "em_analise"),
    admin.from("atendimentos").select("id", { count: "exact", head: true }).eq("status", "aberto"),
    admin.from("acoes_pendentes").select("id", { count: "exact", head: true }).eq("status", "pendente"),
  ]);
  const itens: [string, string, typeof Gauge, number?][] = [
    ["/admin", "Visão geral", Gauge],
    ["/admin/usuarios", "Usuários", Users],
    ["/admin/locadoras", "Locadoras", Building2],
    ["/admin/carros", "Carros", Car],
    ["/admin/anuncios", "Anúncios", Megaphone],
    ["/admin/contratos", "Contratos", FileSignature],
    ["/admin/cobrancas", "Cobranças", Wallet],
    ["/admin/verificacoes", "Verificações", BadgeCheck, verificar ?? 0],
    ["/admin/suporte", "Suporte", LifeBuoy, suporte ?? 0],
    ["/admin/mensagens", "Mensagens", Send],
    ["/admin/acoes", "Ações pendentes", ShieldAlert, acoes ?? 0],
    ["/admin/erros", "Erros do app", AlertTriangle],
    ["/admin/auditoria", "Auditoria", ScrollText],
  ];
  return (
    <div className="min-h-dvh bg-fundo lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="border-b border-borda bg-cartao lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-4 py-3 lg:block lg:py-5">
          <Link href="/admin" className="flex items-center gap-2"><Marca /><span className="rounded-md bg-marca-suave px-1.5 text-[0.65rem] font-bold text-marca">ADMIN</span></Link>
          <p className="truncate text-xs text-suave lg:mt-2">{usuario.email}</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 [scrollbar-width:none] lg:flex-col lg:px-3">
          {itens.map(([href, rotulo, Icone, n]) => (
            <Link key={href} href={href as Route} className="flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-texto hover:bg-cartao-2">
              <Icone size={17} className="text-suave" />
              <span className="flex-1">{rotulo}</span>
              {!!n && <span className="rounded-full bg-alerta px-1.5 text-[0.65rem] font-bold text-white">{n}</span>}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 px-4 py-6 lg:px-8">{children}</div>
    </div>
  );
}
