import { BadgeCheck, Landmark, QrCode, Split } from "lucide-react";
import { Aviso, CabecalhoPagina, Cartao, DadoRotulado, Selo } from "@/components/ui";
import { taxaPlataformaDoPeriodo } from "@/dominio/plataforma/taxa";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { contaDoLocador, garantirPixAtivo } from "@/lib/cobrancas";
import { exigirEquipe } from "@/lib/sessao";
import { FormularioRecebimentos } from "./formulario";

export default async function Recebimentos() {
  const { organizacao, papel } = await exigirEquipe();
  const conta = await contaDoLocador(organizacao.id);
  const pixAtivo = conta ? await garantirPixAtivo(conta.chaveApi).catch(() => false) : false;
  const taxaSemana = taxaPlataformaDoPeriodo(organizacao.mensalidade_por_carro_centavos, 7);

  return (
    <div className="max-w-4xl">
      <CabecalhoPagina titulo="Recebimentos" subtitulo="Onde cai o Pix que os motoristas pagam." />

      <div className="mb-5 grid gap-2.5 sm:grid-cols-3">
        {[
          { icone: Landmark, titulo: "Conta sua", texto: "O Pix cai numa conta Asaas no seu nome. A plataforma não guarda o seu dinheiro." },
          { icone: QrCode, titulo: "Pix automático", texto: "Cada aluguel vira um Pix com QR Code. A baixa é automática quando o motorista paga." },
          { icone: Split, titulo: "Taxa no próprio Pix", texto: `A mensalidade sai por carro alugado: ${formatarBRL(taxaSemana)} por semana. Carro parado não paga.` },
        ].map(({ icone: Icone, titulo, texto }) => (
          <Cartao key={titulo} className="flex gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-marca-suave text-marca"><Icone size={16} /></span>
            <div>
              <p className="text-sm font-bold">{titulo}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-suave">{texto}</p>
            </div>
          </Cartao>
        ))}
      </div>

      {conta ? (
        <Cartao>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-bold"><BadgeCheck size={18} className="text-ok" /> Recebimentos ativos</p>
            <span className="flex gap-2"><Selo tom="ok">Conta Asaas criada</Selo>{pixAtivo ? <Selo tom="ok">Pix ativo</Selo> : <Selo tom="alerta">Pix sendo liberado</Selo>}</span>
          </div>
          <dl className="divide-y divide-borda">
            <DadoRotulado rotulo="Titular">{organizacao.nome}</DadoRotulado>
            <DadoRotulado rotulo="Conta">{conta.conta_id}</DadoRotulado>
            <DadoRotulado rotulo="Carteira">{conta.wallet_id}</DadoRotulado>
            <DadoRotulado rotulo="E-mail de acesso">{(conta.dados as { email?: string } | null)?.email ?? "—"}</DadoRotulado>
          </dl>
          {!pixAtivo && <div className="mt-4"><Aviso tom="alerta" titulo="Pix sendo liberado">O banco leva alguns minutos para liberar o Pix de uma conta nova. Esta página tenta ativar a chave Pix toda vez que é aberta.</Aviso></div>}
          <p className="mt-4 text-sm text-suave">O Asaas manda um e-mail para você criar a senha e acompanhar o saldo e os saques pelo app dele.</p>
        </Cartao>
      ) : papel !== "dono" ? (
        <Aviso tom="alerta">Só o dono da conta pode ativar os recebimentos.</Aviso>
      ) : (
        <Cartao>
          <p className="font-bold">Ativar recebimentos</p>
          <p className="mt-1 mb-5 text-sm text-suave">Dados exigidos pelo Banco Central para abrir a conta de recebimento em nome de {organizacao.nome}.</p>
          <FormularioRecebimentos pessoaFisica={organizacao.documento.length === 11} />
        </Cartao>
      )}
    </div>
  );
}
