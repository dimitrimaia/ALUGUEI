import { CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { Aviso, BotaoLink, Cartao } from "@/components/ui";
import { nomeDiaDaSemana } from "@/dominio/contrato/variaveis";
import { data, diaDaSemana, formatarData, hoje } from "@/dominio/datas/data";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { contaDoLocador, emitirCobranca } from "@/lib/cobrancas";
import { pixDireto } from "@/lib/pix-direto";
import { contratosDoMotorista } from "@/lib/motorista";
import { TIPO_OBRIGACAO } from "@/lib/rotulos";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PainelPix, PainelPixDireto } from "./pix";

/** Pagar com Pix: gera a cobrança na hora, se ainda não existir, e mostra QR Code e copia e cola. */
export default async function Pagar({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await exigirUsuario(`/m/pagar/${id}`);
  const { data: o } = await supabaseAdmin().from("obrigacoes").select("*").eq("id", id).maybeSingle();
  if (!o || !(await contratosDoMotorista(usuario.id)).some((c) => c.id === o.contrato_id)) notFound();

  const venc = data(o.vencimento);
  const cabecalho = (
    <div className="text-center">
      <p className="text-sm text-suave">{TIPO_OBRIGACAO[o.tipo]} · {nomeDiaDaSemana(diaDaSemana(venc))}, {formatarData(venc)}</p>
      <p className="text-4xl font-extrabold tracking-tight">{formatarBRL(o.valor_centavos ?? 0)}</p>
      {venc < hoje() && o.status !== "cumprida" && <p className="mt-1 text-sm font-semibold text-perigo">Vencido: multa e juros são somados no Pix</p>}
    </div>
  );

  if (o.status === "cumprida") {
    return (
      <div className="flex flex-col gap-4">
        <CabecalhoMotorista titulo="Pagamento" />
        <Cartao className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 size={48} className="text-ok" />
          {cabecalho}
          <p className="font-semibold text-ok">Pago. Obrigado!</p>
        </Cartao>
        <BotaoLink href="/m/extrato" variante="secundario">Ver extrato</BotaoLink>
      </div>
    );
  }

  // Sem conta de recebimento, mas com chave Pix cadastrada: Pix direto para o locador.
  const [conta, { data: org }] = await Promise.all([
    contaDoLocador(o.organizacao_id).catch(() => null),
    supabaseAdmin().from("organizacoes").select("nome, cidade, chave_pix_direto").eq("id", o.organizacao_id).single(),
  ]);
  if (!conta && org?.chave_pix_direto) {
    const pix = await pixDireto({ chave: org.chave_pix_direto, nome: org.nome, cidade: org.cidade, valorCentavos: o.valor_centavos ?? 0, obrigacaoId: o.id });
    return (
      <div className="flex flex-col gap-4">
        <CabecalhoMotorista titulo="Pagar com Pix" />
        <Cartao className="flex flex-col items-center gap-5 py-7">
          {cabecalho}
          <PainelPixDireto obrigacaoId={o.id} copiaECola={pix.copiaECola} imagem={pix.imagem} informado={Boolean(o.pagamento_informado_em)} favorecido={org.nome} />
        </Cartao>
        <p className="px-2 text-center text-xs text-suave">O Pix vai direto para a conta de {org.nome}. Depois de pagar, toque em “Já paguei” para o locador conferir e dar baixa.</p>
      </div>
    );
  }

  let cobranca;
  let erro: string | null = null;
  try {
    cobranca = await emitirCobranca(o.id);
  } catch (e) {
    erro = e instanceof Error ? e.message : "Não foi possível gerar o Pix agora.";
  }

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoMotorista titulo="Pagar com Pix" />
      <Cartao className="flex flex-col items-center gap-5 py-7">
        {cabecalho}
        {erro || !cobranca ? (
          <Aviso tom="alerta" titulo="Pix indisponível">{erro ?? "Tente de novo em instantes."} Se precisar, fale com o locador.</Aviso>
        ) : (
          <PainelPix obrigacaoId={o.id} copiaECola={cobranca.pix_copia_e_cola} imagem={cobranca.pix_qr_code} link={cobranca.link_pagamento} />
        )}
      </Cartao>
      <p className="px-2 text-center text-xs text-suave">O Pix vai direto para a conta do locador. A confirmação chega em segundos.</p>
    </div>
  );
}
