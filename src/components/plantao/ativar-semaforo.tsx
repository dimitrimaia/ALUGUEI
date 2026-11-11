"use client";

import { Accessibility, BatteryCharging, Bell, Check, ChevronRight, Hand, Layers, Play, Power, ShieldAlert, Smartphone, Square, Zap } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Aviso, Botao, Cartao, Selo } from "@/components/ui";
import { type EstadoNativo, plantaoNativo, plataforma, soltarOuvinte } from "@/lib/nativo";

// v2: texto novo da declaração (revisão da Play). Quem aceitou a antiga vê de novo.
const CHAVE_ACEITE = "aluguei_semaforo_aceite_v2";

/**
 * Declaração em destaque (Google Play, política da API de acessibilidade, e LGPD):
 * aparece ANTES de pedir a permissão e diz quais dados o serviço lê, para quê,
 * onde ficam e com quem são compartilhados. Mantenha igual à Segurança dos dados
 * da Play e à política de privacidade (src/app/privacidade).
 */
function Termo({ aoAceitar }: { aoAceitar: () => void }) {
  const [marcado, setMarcado] = useState(false);
  const item = "flex gap-2.5 text-sm leading-snug";
  return (
    <Cartao className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-alerta-suave text-alerta"><ShieldAlert size={19} /></span>
        <h2 className="font-bold leading-tight">O Copiloto usa o serviço de acessibilidade do Android</h2>
      </div>
      <p className="text-sm">
        Para mostrar se uma corrida compensa, o Aluguei usa a API de acessibilidade (AccessibilityService) para <strong>ler o texto da tela somente nos apps de corrida Uber, 99, inDrive e 37 City</strong>, e só enquanto o Copiloto estiver ligado. Ele não é um recurso de acessibilidade.
      </p>

      <div className="flex flex-col gap-2 rounded-xl bg-cartao-2 p-3">
        <p className="text-xs font-bold tracking-wide text-suave uppercase">Dados que o Copiloto coleta da tela</p>
        <ul className="flex flex-col gap-2">
          <li className={item}><span aria-hidden>•</span><span><strong>Dados da oferta:</strong> valor da corrida, distância e tempo até o passageiro e da viagem.</span></li>
          <li className={item}><span aria-hidden>•</span><span><strong>Nome do passageiro</strong>, quando o app de corrida mostra.</span></li>
          <li className={item}><span aria-hidden>•</span><span><strong>Endereços</strong> de embarque, paradas e destino.</span></li>
          <li className={item}><span aria-hidden>•</span><span><strong>Outras informações pessoais do passageiro:</strong> nota, número de corridas, forma de pagamento e se a corrida tem parada.</span></li>
          <li className={item}><span aria-hidden>•</span><span><strong>Outras ações suas no app de corrida:</strong> se você aceitou ou recusou a oferta, a contraproposta que fez e quando a corrida começou e terminou.</span></li>
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold tracking-wide text-suave uppercase">Para que usamos</p>
        <ul className="flex flex-col gap-2">
          <li className={item}><span aria-hidden>•</span><span>Calcular na hora o lucro, o R$ por km e o R$ por hora da oferta e mostrar o resultado no cartão por cima da tela.</span></li>
          <li className={item}><span aria-hidden>•</span><span>Avisar quando o embarque ou o destino é um lugar que você marcou para evitar, ou um alerta de segurança da comunidade.</span></li>
          <li className={item}><span aria-hidden>•</span><span>Registrar no seu histórico as corridas que você fez e as que recusou, com ganhos e relatórios.</span></li>
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold tracking-wide text-suave uppercase">Onde ficam e com quem compartilhamos</p>
        <ul className="flex flex-col gap-2">
          <li className={item}><span aria-hidden>•</span><span>Os dados ficam no seu celular e na sua conta do Aluguei, com acesso cifrado, e só você vê. Você pode apagar em Conta → Privacidade.</span></li>
          <li className={item}><span aria-hidden>•</span><span><strong>Não vendemos nem compartilhamos com terceiros.</strong> Só os lugares que você marcar como "evitar" entram, sem o seu nome, nos alertas da comunidade.</span></li>
          <li className={item}><span aria-hidden>•</span><span>O Copiloto não lê outros apps nem senhas, não grava a imagem da tela e <strong>nunca toca, aceita ou recusa corridas por você</strong>.</span></li>
        </ul>
      </div>

      <p className="text-xs text-suave">Você pode desligar quando quiser: na notificação "Copiloto ligado", arrastando a bolha até o X, aqui ou nas configurações de acessibilidade do Android. Sem a acessibilidade, a bolha funciona com digitação rápida. Mais detalhes na <Link href="/privacidade" className="font-semibold text-marca">política de privacidade</Link>.</p>

      <label className="flex items-start gap-3 rounded-xl border border-borda p-3 text-sm font-medium">
        <input type="checkbox" checked={marcado} onChange={(e) => setMarcado(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--marca)]" />
        Concordo que o Aluguei colete e use esses dados da tela dos apps de corrida para as finalidades acima.
      </label>
      <div className="grid grid-cols-2 gap-2">
        <Link href="/m/plantao" className="grid h-12 place-items-center rounded-xl border border-borda text-sm font-semibold">Não concordo</Link>
        <Botao tamanho="lg" disabled={!marcado} onClick={aoAceitar}>Concordo e continuar</Botao>
      </div>
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
      "Toque em \"Aluguei · Copiloto\".",
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
  const [ambiente, setAmbiente] = useState<"carregando" | ReturnType<typeof plataforma>>("carregando");
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
      soltarOuvinte(ouvinte);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [atualizar]);

  if (ambiente === "carregando") return null;

  if (ambiente !== "android") {
    return (
      <div className="flex flex-col gap-4">
        <Cartao className="flex flex-col gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-marca-suave text-marca"><Smartphone size={22} /></span>
          <h2 className="text-lg font-bold">{ambiente === "ios" ? "No iPhone, use a calculadora" : ambiente === "app-sem-ponte" ? "Atualize o app do Aluguei" : "A bolha funciona no app Android"}</h2>
          <p className="text-sm text-suave">
            {ambiente === "app-sem-ponte"
              ? "Esta versão do app não conectou a bolha. Instale a versão mais nova do Aluguei e abra esta tela de novo."
              : ambiente === "ios"
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
            <h2 className="font-bold">Copiloto {estado.ligado ? "ligado" : "pronto"}</h2>
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
              Ligar o Copiloto
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
          { icone: Play, titulo: "Ligue o Copiloto e abra o inDrive, a Uber ou a 99", texto: "Uma bolha pequena fica no canto da tela. Arraste para onde quiser." },
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
