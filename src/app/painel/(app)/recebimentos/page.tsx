import { BadgeCheck, Landmark, QrCode, Split } from "lucide-react";
import { Aviso, CabecalhoPagina, Cartao, DadoRotulado, Selo } from "@/components/ui";
import { taxaPlataformaDoPeriodo } from "@/dominio/plataforma/taxa";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { contaDoLocador } from "@/lib/cobrancas";
import { exigirEquipe } from "@/lib/sessao";
import { FormularioRecebimentos } from "./formulario";

export default async function Recebimentos() {
  const { organizacao, papel } = await exigirEquipe();
  const conta = await contaDoLocador(organizacao.id);
  const taxaSemana = taxaPlataformaDoPeriodo(organizacao.mensalidade_por_carro_centavos, 7);

  return (
    <div className="max-w-4xl">
      <CabecalhoPagina titulo="Recebimentos" subtitulo="Onde cai o Pix que os motoristas pagam." />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { icone: Landmark, titulo: "Conta sua", texto: "O Pix cai numa conta Asaas no seu nome. A plataforma não guarda o seu dinheiro." },
          { icone: QrCode, titulo: "Pix automático", texto: "Cada aluguel vira um Pix com QR Code. A baixa é automática quando o motorista paga." },
          { icone: Split, titulo: "Taxa no próprio Pix", texto: `A mensalidade sai por carro alugado: ${formatarBRL(taxaSemana)} por semana. Carro parado não paga.` },
        ].map(({ icone: Icone, titulo, texto }) => (
          <Cartao key={titulo}>
            <span className="grid size-10 place-items-center rounded-xl bg-marca-suave text-marca"><Icone size={20} /></span>
            <p className="mt-3 font-bold">{titulo}</p>
            <p className="mt-1 text-sm text-suave">{texto}</p>
          </Cartao>
        ))}
      </div>

      {conta ? (
        <Cartao>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-lg font-bold"><BadgeCheck className="text-ok" /> Recebimentos ativos</p>
            <Selo tom="ok">Conta Asaas criada</Selo>
          </div>
          <dl className="divide-y divide-borda">
            <DadoRotulado rotulo="Titular">{organizacao.nome}</DadoRotulado>
            <DadoRotulado rotulo="Conta">{conta.conta_id}</DadoRotulado>
            <DadoRotulado rotulo="Carteira">{conta.wallet_id}</DadoRotulado>
            <DadoRotulado rotulo="E-mail de acesso">{(conta.dados as { email?: string } | null)?.email ?? "—"}</DadoRotulado>
          </dl>
          <p className="mt-4 text-sm text-suave">O Asaas manda um e-mail para você criar a senha e acompanhar o saldo e os saques pelo app dele.</p>
        </Cartao>
      ) : papel !== "dono" ? (
        <Aviso tom="alerta">Só o dono da conta pode ativar os recebimentos.</Aviso>
      ) : (
        <Cartao>
          <p className="text-lg font-bold">Ativar recebimentos</p>
          <p className="mt-1 mb-5 text-sm text-suave">Dados exigidos pelo Banco Central para abrir a conta de recebimento em nome de {organizacao.nome}.</p>
          <FormularioRecebimentos pessoaFisica={organizacao.documento.length === 11} />
        </Cartao>
      )}
    </div>
  );
}
