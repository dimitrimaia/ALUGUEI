import { BotaoLink, Cartao, Suave } from "@/components/ui";
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
      <main className="mx-auto max-w-md p-6">
        <h1 className="mb-2 text-xl font-semibold">Convite inválido</h1>
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
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <div>
        <Suave>Convite de {org?.nome}{org ? ` · ${org.cidade}/${org.uf}` : ""}</Suave>
        <h1 className="text-2xl font-semibold">Olá, {l.nome.split(" ")[0]}!</h1>
      </div>
      {veiculo && (
        <Cartao>
          <Suave>Veículo</Suave>
          <p className="text-lg font-semibold">{veiculo.modelo}</p>
          <Suave>{[veiculo.ano_modelo, veiculo.cor, formatarPlaca(veiculo.placa)].filter(Boolean).join(" · ")}</Suave>
        </Cartao>
      )}
      {oferta && (
        <Cartao className="grid grid-cols-2 gap-3">
          <div>
            <Suave>Aluguel</Suave>
            <p className="font-semibold">{formatarBRL(oferta.aluguelSemanal)}/semana</p>
          </div>
          <div>
            <Suave>Caução</Suave>
            <p className="font-semibold">{formatarBRL(oferta.caucao)}</p>
          </div>
          <div>
            <Suave>Franquia</Suave>
            <p className="font-semibold">{oferta.franquiaKmMensal.toLocaleString("pt-BR")} km/mês</p>
          </div>
          <div>
            <Suave>Prazo</Suave>
            <p className="font-semibold">{oferta.prazoMeses} meses</p>
          </div>
        </Cartao>
      )}
      <Cartao>
        <p className="mb-1 font-medium">Para o cadastro, tenha em mãos:</p>
        <Suave>CNH com a observação EAR, documento com foto, comprovante de endereço e um print do seu perfil no Uber ou 99. Leva uns 5 minutos.</Suave>
      </Cartao>
      {usuario ? (
        <BotaoAceitar token={token} />
      ) : (
        <BotaoLink href={`/entrar?voltar=${encodeURIComponent(`/convite/${token}`)}`}>Começar cadastro</BotaoLink>
      )}
    </main>
  );
}
