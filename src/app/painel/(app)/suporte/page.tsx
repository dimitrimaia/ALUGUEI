import { ListaAtendimentos } from "@/components/suporte/lista";
import { NovoAtendimento } from "@/components/suporte/novo";
import { CabecalhoPagina, Cartao } from "@/components/ui";
import { exigirEquipe } from "@/lib/sessao";
import { ASSUNTOS_SUPORTE, atendimentosDoUsuario } from "@/lib/suporte";

export const metadata = { title: "Suporte" };

export default async function SuporteLocador() {
  const { usuario } = await exigirEquipe();
  const atendimentos = await atendimentosDoUsuario(usuario.id);
  return (
    <div className="max-w-2xl">
      <CabecalhoPagina voltar={{ href: "/painel", rotulo: "Início" }} titulo="Suporte" />
      <div className="flex flex-col gap-4">
        <Cartao>
          <h2 className="font-semibold">Falar com o Aluguei</h2>
          <p className="mt-1 mb-4 text-sm text-suave">Dúvida sobre o app, recebimentos, contrato ou um motorista? Escreva aqui: a conversa fica registrada.</p>
          <NovoAtendimento modo="locador" assuntos={ASSUNTOS_SUPORTE} />
        </Cartao>
        <ListaAtendimentos atendimentos={atendimentos} base="/painel/suporte" />
      </div>
    </div>
  );
}
