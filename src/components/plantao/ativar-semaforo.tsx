"use client";

import { Accessibility, BatteryCharging, Bell, Check, ChevronRight, Hand, Layers, Play, Power, ShieldAlert, Smartphone, Square, Zap } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Aviso, Botao, Cartao, Selo } from "@/components/ui";
import { type EstadoNativo, plantaoNativo, plataforma } from "@/lib/nativo";

const CHAVE_ACEITE = "aluguei_semaforo_aceite_v1";

/** O que o motorista precisa saber ANTES de ligar (exigido pela Google Play e pela LGPD). */
function Termo({ aoAceitar }: { aoAceitar: () => void }) {
  const [marcado, setMarcado] = useState(false);
  return (
    <Cartao className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-alerta-suave text-alerta"><ShieldAlert size={19} /></span>
        <h2 className="font-bold">Antes de ligar, leia com atenção</h2>
      </div>
      <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-texto/90">
        <li><strong>O que faz:</strong> quando chega uma oferta na Uber, na 99 ou na inDrive, o Aluguei lê na tela só o valor, os km e os minutos da oferta, calcula se vale a pena e mostra o resultado numa bolha por cima do app.</li>
        <li><strong>Para isso usa o serviço de acessibilidade do Android</strong>, que permite ler o texto que aparece na tela. Ele só funciona dentro desses apps de corrida e só com o plantão ligado.</li>
        <li><strong>O que guardamos:</strong> só os números de cada oferta (valor, distância, tempo e o resultado), para os seus relatórios. Nunca guardamos a tela, nomes, endereços ou mensagens. Nada é vendido nem compartilhado.</li>
        <li><strong>Não aceita nem recusa corridas por você.</strong> Quem decide e toca no app é sempre você.</li>
        <li><strong>Riscos:</strong> Uber e 99 não autorizam apps de terceiros lendo a tela delas; em casos raros isso pode gerar advertência na conta. Eles também mudam a tela de vez em quando, e a leitura pode falhar até atualizarmos. Se preferir, use só a <strong>digitação rápida</strong> na bolha, sem acessibilidade.</li>
        <li>Você pode desligar quando quiser: na notificação "Plantão ligado", arrastando a bolha até o X, ou aqui.</li>
      </ul>
      <label className="flex items-start gap-3 rounded-xl bg-cartao-2 p-3 text-sm font-medium">
        <input type="checkbox" checked={marcado} onChange={(e) => setMarcado(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--marca)]" />
        Li e entendi. Quero usar o semáforo de corridas.
      </label>
      <Botao tamanho="lg" disabled={!marcado} onClick={aoAceitar} className="w-full">Continuar</Botao>
    </Cartao>
  );
}

type Passo = { chave: "notificacoes" | "sobreposicao" | "acessibilidade" | "bateria"; titulo: string; porque: string; tutorial: string[]; icone: typeof Bell; opcional?: boolean };

const PASSOS: Passo[] = [
  {
    chave: "sobreposicao",
    titulo: "Mostrar sobre outros apps",
    porque: "É o que deixa a bolha aparecer por cima da Uber e da 99.",
    tutorial: ["Na tela que abrir, procure Aluguei na lista (se ela aparecer).", "Ligue a chave \"Permitir sobreposição a outros apps\".", "Pronto: o Aluguei volta sozinho para cá."],
    icone: Layers,
  },
  { chave: "notificacoes", titulo: "Permitir notificações", porque: "Para mostrar \"Plantão ligado\" enquanto a bolha funciona (o Android exige).", tutorial: ["Toque em Permitir na janela que vai abrir."], icone: Bell },
  {
    chave: "acessibilidade",
    titulo: "Leitura automática das ofertas",
    porque: "Liga a leitura da oferta na tela, sem você digitar nada. Opcional: sem ela, a bolha funciona com digitação rápida.",
    tutorial: [
      "Na tela de Acessibilidade, toque em \"Apps instalados\" (ou \"Serviços baixados\").",
      "Toque em \"Aluguei · Semáforo de corridas\".",
      "Ligue a chave \"Usar\" e toque em \"Permitir\" no aviso do Android.",
      "Pronto: o Aluguei volta sozinho para cá.",
    ],
    icone: Accessibility,
    opcional: true,
  },
  {
    chave: "bateria",
    titulo: "Não economizar bateria no Aluguei",
    porque: "Alguns celulares (Xiaomi, Samsung, Motorola) desligam a bolha depois de um tempo para poupar bateria. Gasta pouco: a bolha só trabalha quando chega uma oferta.",
    tutorial: ["Toque em Permitir na janela que vai abrir.", "Em Xiaomi: também em Configurações › Apps › Aluguei › Economia de bateria › Sem restrições."],
    icone: BatteryCharging,
    opcional: true,
  },
];

export function AtivarSemaforo() {
  const [ambiente, setAmbiente] = useState<"carregando" | "android" | "ios" | "web">("carregando");
  const [aceite, setAceite] = useState(false);
  const [estado, setEstado] = useState<EstadoNativo | null>(null);
  const [pulados, setPulados] = useState<string[]>([]);
  const [bateriaPedida, setBateriaPedida] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const atualizar = useCallback(async () => {
    const p = plantaoNativo();
    if (!p) return;
    try {
      setEstado(await p.estado());
    } catch {
      setErro("Não consegui falar com o app. Atualize o Aluguei na loja.");
    }
  }, []);

  useEffect(() => {
    setAmbiente(plataforma());
    try {
      setAceite(localStorage.getItem(CHAVE_ACEITE) === "1");
    } catch {}
    const p = plantaoNativo();
    if (!p) return;
    atualizar();
    // O app volta sozinho das configurações e avisa: a tela segue para o próximo passo.
    const ouvinte = p.addListener("permissao", () => atualizar());
    const aoVoltar = () => document.visibilityState === "visible" && atualizar();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      ouvinte.then((o) => o.remove());
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [atualizar]);

  if (ambiente === "carregando") return null;

  if (ambiente !== "android") {
    return (
      <div className="flex flex-col gap-4">
        <Cartao className="flex flex-col gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-marca-suave text-marca"><Smartphone size={22} /></span>
          <h2 className="text-lg font-bold">{ambiente === "ios" ? "No iPhone, use a calculadora" : "A bolha funciona no app Android"}</h2>
          <p className="text-sm text-suave">
            {ambiente === "ios"
              ? "A Apple não permite que um app apareça por cima de outro nem leia a tela dele. No iPhone, use a calculadora: digite valor e km e veja o semáforo na hora."
              : "Mostrar a bolha por cima da Uber e da 99 e ler a oferta sozinho só é possível no aplicativo do Aluguei para Android. Aqui no navegador, a calculadora faz a mesma conta com o que você digitar."}
          </p>
          {ambiente === "web" && <Selo tom="info">App Android: em breve na Google Play</Selo>}
          <Link href="/m/plantao/calculadora" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-marca px-4 text-sm font-semibold text-white">Abrir a calculadora <ChevronRight size={16} /></Link>
        </Cartao>
        <ComoFunciona />
      </div>
    );
  }

  if (!aceite) {
    return (
      <Termo
        aoAceitar={() => {
          try {
            localStorage.setItem(CHAVE_ACEITE, "1");
          } catch {}
          setAceite(true);
        }}
      />
    );
  }

  const p = plantaoNativo();
  if (!p || !estado) return erro ? <Aviso tom="perigo">{erro}</Aviso> : <p className="text-sm text-suave">Conferindo as permissões…</p>;

  const feito = (k: Passo["chave"]) => (k === "notificacoes" ? estado.notificacoes : k === "sobreposicao" ? estado.sobreposicao : k === "acessibilidade" ? estado.acessibilidade : estado.semOtimizacaoBateria || bateriaPedida);
  const atual = PASSOS.find((s) => !feito(s.chave) && !pulados.includes(s.chave));
  const pedir = async (k: Passo["chave"]) => {
    setErro(null);
    try {
      if (k === "notificacoes") await p.pedirNotificacoes();
      if (k === "sobreposicao") await p.pedirSobreposicao();
      if (k === "acessibilidade") await p.pedirAcessibilidade();
      if (k === "bateria") {
        await p.pedirSemOtimizacaoBateria();
        setBateriaPedida(true);
      }
    } catch {
      setErro("Não consegui abrir as configurações. Tente de novo.");
    }
    atualizar();
  };

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-2" aria-label="Passos para ativar">
        {PASSOS.map((s, i) => {
          const ok = feito(s.chave);
          const ativo = atual?.chave === s.chave;
          const Icone = s.icone;
          return (
            <li key={s.chave} className={`rounded-[1.1rem] border bg-cartao p-4 shadow-cartao ${ativo ? "border-marca ring-3 ring-marca/15" : "border-borda"}`}>
              <div className="flex items-center gap-3">
                <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${ok ? "bg-ok-suave text-ok" : ativo ? "bg-marca text-white" : "bg-cartao-2 text-suave"}`}>{ok ? <Check size={18} /> : <Icone size={18} />}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{i + 1}. {s.titulo} {s.opcional && <span className="font-normal text-suave">(opcional)</span>}</p>
                  {!ativo && <p className="truncate text-xs text-suave">{ok ? "Feito" : pulados.includes(s.chave) ? "Pulado" : s.porque}</p>}
                </div>
              </div>
              {ativo && (
                <div className="mt-3 flex flex-col gap-3">
                  <p className="text-sm text-suave">{s.porque}</p>
                  <ol className="flex flex-col gap-1.5 rounded-xl bg-cartao-2 p-3 text-sm">
                    {s.tutorial.map((t, j) => <li key={j} className="flex gap-2"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-marca text-[0.65rem] font-bold text-white">{j + 1}</span>{t}</li>)}
                  </ol>
                  <Botao tamanho="lg" icone={Icone} onClick={() => pedir(s.chave)} className="w-full">{s.chave === "acessibilidade" ? "Abrir Acessibilidade" : s.chave === "sobreposicao" ? "Abrir a permissão" : "Permitir"}</Botao>
                  {s.opcional && <button type="button" onClick={() => setPulados((x) => [...x, s.chave])} className="text-sm font-semibold text-suave">{s.chave === "acessibilidade" ? "Usar só a digitação rápida" : "Pular"}</button>}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {erro && <Aviso tom="perigo">{erro}</Aviso>}

      {!atual && (
        <Cartao className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Semáforo {estado.ligado ? "ligado" : "pronto"}</h2>
            <Selo tom={estado.ligado ? "ok" : "neutro"}>{estado.acessibilidade ? "Leitura automática" : "Digitação rápida"}</Selo>
          </div>
          <p className="text-sm text-suave">
            {estado.ligado ? "Abra a Uber ou a 99. Quando uma oferta tocar, a bolha mostra se vale a pena." : "Ligue antes de começar a rodar. A bolha aparece por cima de tudo e gasta pouca bateria."}
          </p>
          {estado.ligado ? (
            <div className="grid grid-cols-2 gap-2">
              <Botao variante="secundario" icone={Zap} onClick={() => p.simular({ valor: 1840, kmCorrida: 7.4, minutosCorrida: 15, kmBusca: 2.3, minutosBusca: 8 })}>Testar oferta</Botao>
              <Botao variante="perigo" icone={Square} onClick={async () => (await p.desligar(), atualizar())}>Desligar</Botao>
            </div>
          ) : (
            <Botao
              tamanho="lg"
              icone={Power}
              onClick={async () => {
                setErro(null);
                try {
                  await p.ligar();
                } catch (e) {
                  setErro((e as { code?: string }).code === "SEM_SOBREPOSICAO" ? "Falta a permissão \"Mostrar sobre outros apps\"." : "O Android não deixou ligar agora. Tente de novo.");
                }
                atualizar();
              }}
              className="w-full"
            >
              Ligar o semáforo
            </Botao>
          )}
          {!estado.sobreposicao && <Aviso>A permissão "Mostrar sobre outros apps" está desligada. Sem ela a bolha não aparece.</Aviso>}
        </Cartao>
      )}
      <ComoFunciona />
    </div>
  );
}

function ComoFunciona() {
  return (
    <Cartao>
      <h2 className="mb-3 font-bold">Como funciona</h2>
      <ol className="flex flex-col gap-3">
        {[
          { icone: Play, titulo: "Ligue o semáforo e abra a Uber ou a 99", texto: "Uma bolha pequena fica no canto da tela. Arraste para onde quiser." },
          { icone: Zap, titulo: "A oferta toca, a bolha responde", texto: "Verde: vale a pena. Amarelo: avalie. Vermelho: não paga. Com R$/km, R$/hora, lucro e a distância até o passageiro." },
          { icone: Hand, titulo: "Sem leitura automática? Toque na bolha", texto: "Digite o valor e os km da oferta e veja o resultado na hora." },
        ].map(({ icone: Icone, titulo, texto }) => (
          <li key={titulo} className="flex gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-marca-suave text-marca"><Icone size={17} /></span>
            <span><span className="block text-sm font-semibold">{titulo}</span><span className="block text-xs text-suave">{texto}</span></span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-suave">A régua do verde é sua: ajuste os mínimos em <Link href="/m/plantao/custos" className="font-semibold text-marca">Custos do carro</Link>. O aluguel do contrato já entra no cálculo.</p>
    </Cartao>
  );
}
