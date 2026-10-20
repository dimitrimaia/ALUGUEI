"use client";

import { useActionState, useState } from "react";
import { Aviso, Botao, Campo, classeEntrada } from "@/components/ui";
import { criarContrato, type EstadoNovoContrato } from "../acoes";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const reais = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

export function FormularioContrato({
  locatarioId,
  veiculos,
  inicial,
}: {
  locatarioId: string;
  veiculos: { id: string; rotulo: string }[];
  inicial: {
    veiculoId: string;
    inicio: string;
    prazoMeses: number;
    aluguelSemanal: number;
    caucao: number;
    franquiaKmMensal: number;
    valorKmExcedente: number;
    areaCirculacao: string;
  };
}) {
  const [estado, enviar, enviando] = useActionState<EstadoNovoContrato, FormData>(criarContrato, {});
  const [inicio, setInicio] = useState(inicial.inicio);
  const diaDoInicio = new Date(`${inicio}T12:00:00`).getDay();
  const [dia, setDia] = useState<number | null>(null);
  const e = estado.erros ?? {};

  return (
    <form action={enviar} className="flex flex-col gap-4">
      <input type="hidden" name="locatarioId" value={locatarioId} />
      {estado.mensagem && <Aviso tom="perigo">{estado.mensagem}</Aviso>}
      <Campo rotulo="Veículo" erro={e.veiculoId}>
        <select name="veiculoId" defaultValue={inicial.veiculoId} className={classeEntrada} required>
          <option value="">Escolha</option>
          {veiculos.map((v) => <option key={v.id} value={v.id}>{v.rotulo}</option>)}
        </select>
      </Campo>
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Início" erro={e.inicio}>
          <input name="inicio" type="date" value={inicio} onChange={(ev) => setInicio(ev.target.value)} className={classeEntrada} required />
        </Campo>
        <Campo rotulo="Prazo (meses)" erro={e.prazoMeses}>
          <input name="prazoMeses" inputMode="numeric" defaultValue={inicial.prazoMeses} className={classeEntrada} required />
        </Campo>
        <Campo rotulo="Dia do pagamento" dica="O 1º pagamento é no início." erro={e.diaVencimento}>
          <select name="diaVencimento" value={dia ?? diaDoInicio} onChange={(ev) => setDia(Number(ev.target.value))} className={classeEntrada}>
            {DIAS.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Aluguel semanal (R$)" erro={e.aluguelSemanal}>
          <input name="aluguelSemanal" inputMode="decimal" defaultValue={reais(inicial.aluguelSemanal)} className={classeEntrada} required />
        </Campo>
        <Campo rotulo="Caução (R$)" erro={e.caucao}>
          <input name="caucao" inputMode="decimal" defaultValue={reais(inicial.caucao)} className={classeEntrada} required />
        </Campo>
        <Campo rotulo="Parcelas da caução" dica="Vencem junto com os primeiros aluguéis." erro={e.parcelasCaucao}>
          <select name="parcelasCaucao" defaultValue="2" className={classeEntrada}>
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}x</option>)}
          </select>
        </Campo>
        <Campo rotulo="Franquia (km/mês)" erro={e.franquiaKmMensal}>
          <input name="franquiaKmMensal" inputMode="numeric" defaultValue={inicial.franquiaKmMensal} className={classeEntrada} required />
        </Campo>
        <Campo rotulo="Km excedente (R$/km)" erro={e.valorKmExcedente}>
          <input name="valorKmExcedente" inputMode="decimal" defaultValue={reais(inicial.valorKmExcedente)} className={classeEntrada} required />
        </Campo>
      </div>
      <Campo rotulo="Área de circulação permitida" erro={e.areaCirculacao}>
        <input name="areaCirculacao" defaultValue={inicial.areaCirculacao} className={classeEntrada} required />
      </Campo>
      <Aviso tom="neutro">Multa de 5%, juros de 1% ao mês, notificação após 5 dias de atraso e check-in toda segunda seguem o padrão do contrato.</Aviso>
      <Botao disabled={enviando}>{enviando ? "Gerando contrato…" : "Gerar contrato e enviar para assinatura"}</Botao>
    </form>
  );
}
