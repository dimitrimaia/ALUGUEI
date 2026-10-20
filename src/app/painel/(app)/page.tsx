import Link from "next/link";
import { BotaoLink, Cartao, Suave, Titulo } from "@/components/ui";
import { exigirEquipe } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/servidor";

/** Painel do locador (RF-120). Cobranças, check-ins e revisões entram com os contratos. */
export default async function VisaoGeral() {
  const { organizacao } = await exigirEquipe();
  const supabase = await supabaseServidor();
  const [{ data: veiculos }, { data: motoristas }] = await Promise.all([
    supabase.from("veiculos").select("status").eq("organizacao_id", organizacao.id),
    supabase.from("locatarios").select("status").eq("organizacao_id", organizacao.id),
  ]);

  const conta = <T extends { status: string }>(lista: T[] | null, status: string) =>
    (lista ?? []).filter((x) => x.status === status).length;

  const indicadores = [
    { rotulo: "Veículos alugados", valor: conta(veiculos, "alugado"), href: "/painel/veiculos" },
    { rotulo: "Veículos disponíveis", valor: conta(veiculos, "disponivel"), href: "/painel/veiculos" },
    { rotulo: "Cadastros para analisar", valor: conta(motoristas, "em_analise"), href: "/painel/motoristas" },
    { rotulo: "Convites em aberto", valor: conta(motoristas, "convidado") + conta(motoristas, "em_cadastro"), href: "/painel/motoristas" },
  ] as const;

  const vazio = (veiculos ?? []).length === 0;

  return (
    <>
      <Titulo>Visão geral</Titulo>
      {vazio ? (
        <Cartao className="flex flex-col items-start gap-3">
          <p className="font-medium">Comece cadastrando seu primeiro veículo.</p>
          <Suave>Depois é só convidar o motorista pelo WhatsApp.</Suave>
          <BotaoLink href="/painel/veiculos/novo">Cadastrar veículo</BotaoLink>
        </Cartao>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {indicadores.map((i) => (
            <Link key={i.rotulo} href={i.href}>
              <Cartao>
                <Suave>{i.rotulo}</Suave>
                <p className="text-3xl font-semibold">{i.valor}</p>
              </Cartao>
            </Link>
          ))}
        </section>
      )}
    </>
  );
}
