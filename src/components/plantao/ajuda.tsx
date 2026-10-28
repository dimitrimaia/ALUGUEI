"use client";

import { CheckCircle2, ChevronDown, CircleAlert, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Cartao } from "@/components/ui";
import { type EstadoNativo, plantaoNativo, plataforma } from "@/lib/nativo";

const PERGUNTAS: { p: string; r: string; tag: string }[] = [
  { tag: "Começar", p: "O que preciso configurar primeiro?", r: "Em Custos do carro: combustível, média e o aluguel (se o carro é do Aluguei, ele entra sozinho). Depois, na Régua do Copiloto, o mínimo por km e por hora que você aceita." },
  { tag: "Copiloto", p: "O Copiloto não aparece no inDrive", r: "Confira no Copiloto se as permissões estão verdes (mostrar sobre outros apps e acessibilidade) e se ele está ligado. No menu da bolha (segure a bolha), ligue o Diagnóstico: ele mostra o que está lendo. Em celulares Xiaomi e Samsung, tire a economia de bateria do Aluguei." },
  { tag: "Copiloto", p: "A acessibilidade está bloqueada (configuração restrita)", r: "App instalado fora da loja: abra Configurações › Apps › Aluguei › ⋮ (canto de cima) › Permitir configurações restritas. Depois ative de novo pelo Copiloto." },
  { tag: "Copiloto", p: "Preciso digitar a minha contraproposta?", r: "Não. Quando você envia pelo inDrive, aparece “Oferecendo sua tarifa R$ X” e o Copiloto lê e recalcula sozinho. Ele só não digita no inDrive por você, por segurança da sua conta." },
  { tag: "Copiloto", p: "Como ele sugere o valor da contraproposta?", r: "Ele procura o menor valor (até o dobro da oferta) que deixa a corrida verde pela sua régua, contando a volta para casa se você ligou. Se um atalho do inDrive já serve: “Toque em R$ X”. Se não: “Use o lápis: R$ X”." },
  { tag: "Copiloto", p: "O Copiloto pode bloquear minha conta?", r: "Ele só lê a tela e mostra o cálculo; nunca toca, aceita ou oferta nada por você. Mesmo assim, Uber e 99 não autorizam apps de terceiros lendo a tela delas. Se preferir, use só a digitação rápida na bolha." },
  { tag: "Régua", p: "Qual a diferença entre o mínimo e o “boa a partir de”?", r: "Abaixo do mínimo a corrida é vermelha; a partir do “boa”, verde; no meio, âmbar (avalie). Sem o “boa”, vale o mínimo como verde e até 15% abaixo dele é âmbar." },
  { tag: "Régua", p: "Como funciona a volta para casa?", r: "Defina a base em Ajustes do Copiloto e ligue “Contar a volta para casa” na régua. O Copiloto calcula a distância do destino até a base e desconta o custo de voltar vazio do lucro." },
  { tag: "Finanças", p: "Por que aparece gasto se eu não lancei nada?", r: "Os gastos fixos do mês (aluguel, seguro) entram todo dia, rodando ou não, e o combustível é estimado pelo km até você lançar um abastecimento. Assim o lucro mostra o que sobra de verdade." },
  { tag: "Finanças", p: "O que é a virada do dia às 4h?", r: "Quem roda de madrugada pode contar o que fez até as 4h no dia anterior, como a Uber faz. Escolha em Finanças." },
  { tag: "Finanças", p: "Para que serve a reserva para manutenção?", r: "Cada km gasta um pouco de óleo, pneu e freio. O app mostra quanto você deveria ter guardado pelo km do mês; você lança quanto guardou e quanto usou." },
];

export function Ajuda() {
  const [busca, setBusca] = useState("");
  const [estado, setEstado] = useState<EstadoNativo | null>(null);
  const [ambiente, setAmbiente] = useState<string>("");
  useEffect(() => {
    setAmbiente(plataforma());
    plantaoNativo()?.estado().then(setEstado).catch(() => null);
  }, []);
  const n = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const lista = PERGUNTAS.filter((q) => !busca.trim() || n(`${q.p} ${q.r} ${q.tag}`).includes(n(busca)));
  const itens: [string, boolean | undefined][] = estado
    ? [["Copiloto ligado", estado.ligado], ["Mostrar sobre outros apps", estado.sobreposicao], ["Leitura automática (acessibilidade)", estado.acessibilidade], ["Notificações", estado.notificacoes], ["Bateria sem restrição", (estado as EstadoNativo & { semOtimizacaoBateria?: boolean }).semOtimizacaoBateria], ["Localização (volta para casa)", estado.localizacao]]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <Cartao>
        <h2 className="font-bold">Diagnóstico</h2>
        {estado ? (
          <ul className="mt-2 flex flex-col gap-1.5">
            {itens.map(([r, ok]) => (
              <li key={r} className="flex items-center gap-2 text-sm">{ok ? <CheckCircle2 size={17} className="text-ok" /> : <CircleAlert size={17} className="text-alerta" />}{r}</li>
            ))}
            {estado.dormindo && <li className="text-xs text-suave">O leitor está dormindo porque o app de corrida está offline (modo economia).</li>}
            <li className="text-xs text-suave">{estado.corridasPendentes} ofertas esperando para subir para a conta.</li>
            {estado.ultimoErro && <li className="rounded-lg bg-cartao-2 p-2 font-mono text-[0.7rem] break-words text-suave">Último erro: {estado.ultimoErro}</li>}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-suave">{ambiente === "web" ? "Abra esta tela no app do Aluguei para Android para ver o estado do Copiloto." : "Conferindo…"}</p>
        )}
      </Cartao>
      <label className="relative block">
        <Search size={17} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-suave" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar dúvida" className="h-11 w-full rounded-xl border border-borda bg-cartao pr-3 pl-10 outline-none focus:border-marca" />
      </label>
      <div className="flex flex-col gap-2">
        {lista.map((q) => (
          <details key={q.p} className="group rounded-[1.1rem] border border-borda bg-cartao px-4 py-3 shadow-cartao">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
              <span><span className="mr-2 rounded-full bg-marca-suave px-2 py-0.5 text-[0.65rem] font-bold text-marca">{q.tag}</span>{q.p}</span>
              <ChevronDown size={17} className="shrink-0 text-suave transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-2 text-sm text-suave">{q.r}</p>
          </details>
        ))}
        {!lista.length && <p className="text-center text-sm text-suave">Nada encontrado. Fale com o suporte.</p>}
      </div>
    </div>
  );
}
