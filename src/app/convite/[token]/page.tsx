import { Car, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { BotaoLink, Cartao, Marca, Suave } from "@/components/ui";
import type { Oferta } from "@/db/schema/pessoas";
import { formatarPlaca } from "@/dominio/cadastro/documentos";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { usuarioAtual } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { BotaoAceitar } from "./aceitar";

/** Página pública do convite: mostra o carro e as condições antes de qualquer cadastro. */
export default async function Convite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = supabaseAdmin();
  const { data: l } = await admin
    .from("locatarios")
    .select("nome, organizacao_id, veiculo_ofertado_id, oferta, convite_expira_em")
    .eq("token_convite", token)
    .maybeSingle();

  const valido = l && (!l.convite_expira_em || new Date(l.convite_expira_em) > new Date());
  if (!valido) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <Link href="/" className="mb-8 block w-fit"><Marca /></Link>
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Convite inválido</h1>
        <Suave>Este link venceu ou já foi usado. Peça um novo ao locador.</Suave>
      </main>
    );
  }

  const [{ data: org }, { data: veiculo }] = await Promise.all([
    admin.from("organizacoes").select("nome, cidade, uf").eq("id", l.organizacao_id).single(),
    l.veiculo_ofertado_id
      ? admin.from("veiculos").select("placa, modelo, ano_modelo, cor").eq("id", l.veiculo_ofertado_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const oferta = l.oferta as Oferta | null;
  const usuario = await usuarioAtual();

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 pt-5 pb-10">
      <Link href="/" className="mb-2 block w-fit"><Marca /></Link>
      <div>
        <Suave>Convite de {org?.nome}{org ? ` · ${org.cidade}/${org.uf}` : ""}</Suave>
        <h1 className="text-3xl font-extrabold tracking-tight">Olá, {l.nome.split(" ")[0]}!</h1>
        <p className="mt-1 text-suave">Você foi convidado para alugar um carro.</p>
      </div>
      {veiculo && (
        <Cartao className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-marca-suave text-marca"><Car size={28} aria-hidden /></span>
          <div>
            <p className="text-lg font-bold">{veiculo.modelo}</p>
            <Suave>{[veiculo.ano_modelo, veiculo.cor, formatarPlaca(veiculo.placa)].filter(Boolean).join(" · ")}</Suave>
          </div>
        </Cartao>
      )}
      {oferta && (
        <Cartao className="grid grid-cols-2 gap-4">
          <div>
            <Suave>Aluguel</Suave>
            <p className="text-lg font-bold">{formatarBRL(oferta.aluguelSemanal)}<span className="text-sm font-medium text-suave">/sem</span></p>
          </div>
          <div>
            <Suave>Caução</Suave>
            <p className="text-lg font-bold">{formatarBRL(oferta.caucao)}</p>
          </div>
          <div>
            <Suave>Franquia</Suave>
            <p className="text-lg font-bold">{oferta.franquiaKmMensal.toLocaleString("pt-BR")} km/mês</p>
          </div>
          <div>
            <Suave>Prazo</Suave>
            <p className="text-lg font-bold">{oferta.prazoMeses} meses</p>
          </div>
        </Cartao>
      )}
      <Cartao>
        <p className="mb-3 font-semibold">Para o cadastro, tenha em mãos</p>
        <ul className="flex flex-col gap-2 text-sm">
          {["CNH com a observação EAR", "Comprovante de endereço", "Print do seu perfil no Uber ou 99"].map((item) => (
            <li key={item} className="flex items-center gap-2"><CheckCircle2 size={18} className="text-marca" aria-hidden /> {item}</li>
          ))}
        </ul>
        <Suave className="mt-3">Leva uns 5 minutos.</Suave>
      </Cartao>
      {usuario ? (
        <BotaoAceitar token={token} />
      ) : (
        <BotaoLink tamanho="lg" href={`/entrar?voltar=${encodeURIComponent(`/convite/${token}`)}`}>Começar cadastro</BotaoLink>
      )}
    </main>
  );
}
