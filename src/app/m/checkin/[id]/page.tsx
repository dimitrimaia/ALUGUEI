import { CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { Aviso, BotaoLink, Cartao } from "@/components/ui";
import { diasDeAtraso, situacaoCheckin } from "@/dominio/checkin/checkin";
import { nomeDiaDaSemana } from "@/dominio/contrato/variaveis";
import { data, diaDaSemana, formatarData, hoje } from "@/dominio/datas/data";
import { contratosDoMotorista } from "@/lib/motorista";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Checkin } from "./checkin";

export const metadata = { title: "Check-in semanal" };

export default async function PaginaCheckin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await exigirUsuario(`/m/checkin/${id}`);
  const admin = supabaseAdmin();
  const { data: o } = await admin.from("obrigacoes").select("*").eq("id", id).eq("tipo", "checkin").maybeSingle();
  const contrato = o && (await contratosDoMotorista(usuario.id)).find((c) => c.id === o.contrato_id);
  if (!o || !contrato) notFound();
  const { data: v } = await admin.from("veiculos").select("modelo, odometro_atual").eq("id", contrato.veiculo_id).single();
  const dia = hoje();
  const venc = data(o.vencimento);
  const situacao = situacaoCheckin(venc, dia, o.status === "cumprida");
  const quando = `${nomeDiaDaSemana(diaDaSemana(venc))}, ${formatarData(venc)}`;

  return (
    <>
      <CabecalhoMotorista titulo="Check-in semanal" voltar="/m" />
      {situacao === "feito" ? (
        <Cartao className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 size={44} className="text-ok" />
          <p className="font-semibold">Check-in de {quando} enviado</p>
          <BotaoLink href="/m" variante="secundario">Voltar ao início</BotaoLink>
        </Cartao>
      ) : situacao === "futuro" ? (
        <Aviso tom="neutro" titulo="Ainda não é dia">O check-in desta semana abre na véspera de {quando}.</Aviso>
      ) : contrato.status !== "ativo" ? (
        <Aviso tom="neutro">Este contrato não está ativo.</Aviso>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm text-suave">{v?.modelo} · {quando}</p>
            <h2 className="text-[1.4rem] leading-tight font-bold tracking-tight">Fotos da semana</h2>
          </div>
          {situacao === "atrasado" && (
            <Aviso tom="alerta" titulo={`Atrasado há ${diasDeAtraso(venc, dia)} ${diasDeAtraso(venc, dia) === 1 ? "dia" : "dias"}`}>
              O contrato pede o check-in no dia combinado. Envie agora para ficar em dia.
            </Aviso>
          )}
          <Checkin obrigacaoId={o.id} ultimoKm={v?.odometro_atual ?? 0} />
        </div>
      )}
    </>
  );
}
