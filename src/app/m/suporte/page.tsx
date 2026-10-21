import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { ListaAtendimentos } from "@/components/suporte/lista";
import { NovoAtendimento } from "@/components/suporte/novo";
import { Cartao } from "@/components/ui";
import { exigirUsuario } from "@/lib/sessao";
import { ASSUNTOS_SUPORTE, atendimentosDoUsuario } from "@/lib/suporte";

export const metadata = { title: "Suporte" };

export default async function SuporteMotorista() {
  const usuario = await exigirUsuario("/m/suporte");
  const atendimentos = await atendimentosDoUsuario(usuario.id);
  return (
    <>
      <CabecalhoMotorista titulo="Suporte" />
      <div className="flex flex-col gap-4">
        <Cartao>
          <h2 className="font-semibold">Falar com o Aluguei</h2>
          <p className="mt-1 mb-4 text-sm text-suave">Dúvida sobre o app, um pagamento ou um problema com o carro? A conversa fica aqui, com tudo registrado. Sobre valores do aluguel e regras, fale também com o seu locador.</p>
          <NovoAtendimento modo="motorista" assuntos={ASSUNTOS_SUPORTE} />
        </Cartao>
        <ListaAtendimentos atendimentos={atendimentos} base="/m/suporte" />
      </div>
    </>
  );
}
