"use client";

import { acaoSegura } from "@/lib/versao";
import { ArrowDown, ArrowUp, Home, LocateFixed, MessageSquareText, Plus, Save, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState, useTransition } from "react";
import { Aviso, Botao, Cartao, classeAreaTexto } from "@/components/ui";
import { CAMPOS_CARTAO, MENSAGEM_PADRAO, montarMensagem, NOME_CAMPO, type PreferenciasCopiloto } from "@/dominio/ganhos/copiloto";
import { buscarEnderecoBase, salvarPreferenciasCopiloto } from "@/lib/acoes-plantao";
import { type EstadoCamera, plantaoNativo } from "@/lib/nativo";

function Interruptor({ titulo, texto, ligado, aoMudar }: { titulo: string; texto: string; ligado: boolean; aoMudar: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-2">
      <span><span className="block text-sm font-semibold">{titulo}</span><span className="block text-xs text-suave">{texto}</span></span>
      <input type="checkbox" checked={ligado} onChange={(e) => aoMudar(e.target.checked)} className="peer sr-only" />
      <span className="relative h-7 w-12 shrink-0 rounded-full bg-borda-forte transition-colors peer-checked:bg-marca after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
    </label>
  );
}

function Segmentos<T extends string>({ valor, opcoes, aoMudar }: { valor: T; opcoes: [T, string][]; aoMudar: (v: T) => void }) {
  return (
    <div className="grid gap-1 rounded-xl bg-cartao-2 p-1" style={{ gridTemplateColumns: `repeat(${opcoes.length}, minmax(0, 1fr))` }}>
      {opcoes.map(([v, r]) => (
        <button key={v} type="button" onClick={() => aoMudar(v)} aria-pressed={valor === v} className={`h-9 rounded-lg text-sm font-semibold ${valor === v ? "bg-cartao shadow-cartao" : "text-suave"}`}>{r}</button>
      ))}
    </div>
  );
}

function Bloco({ titulo, texto, children }: { titulo: string; texto?: string; children: ReactNode }) {
  return (
    <Cartao className="flex flex-col gap-3">
      <div><h2 className="font-bold">{titulo}</h2>{texto && <p className="text-xs text-suave">{texto}</p>}</div>
      {children}
    </Cartao>
  );
}

export function AjustesCopiloto({ inicial }: { inicial: PreferenciasCopiloto }) {
  const router = useRouter();
  const [p, setP] = useState(inicial);
  const [estado, setEstado] = useState<{ erro?: string; ok?: boolean }>({});
  const [salvando, iniciar] = useTransition();
  const [busca, setBusca] = useState("");
  const [buscando, iniciarBusca] = useTransition();
  const [avisoBase, setAvisoBase] = useState<string | null>(null);
  const [nativo, setNativo] = useState(false);
  useEffect(() => setNativo(Boolean(plantaoNativo())), []);
  const mudar = (x: Partial<PreferenciasCopiloto>) => (setEstado({}), setP((a) => ({ ...a, ...x })));
  const mover = (i: number, d: -1 | 1) => {
    const l = [...p.campos];
    [l[i], l[i + d]] = [l[i + d]!, l[i]!];
    mudar({ campos: l });
  };
  const previa = montarMensagem(p.mensagem, { hora: new Date().getHours(), nome: "Filipe", minutos: 4 });

  return (
    <div className="flex flex-col gap-4">
      <Bloco titulo="Cartão da oferta" texto="Os 3 primeiros campos aparecem grandes; os outros, na linha de baixo. Até 6.">
        <ol className="flex flex-col gap-1.5">
          {p.campos.map((c, i) => (
            <li key={c} className="flex items-center gap-2 rounded-xl bg-cartao-2 py-1.5 pr-1.5 pl-3">
              <span className={`grid size-6 place-items-center rounded-full text-xs font-bold ${i < 3 ? "bg-marca text-white" : "bg-cartao text-suave"}`}>{i + 1}</span>
              <span className="flex-1 text-sm font-semibold">{NOME_CAMPO[c]}</span>
              <button type="button" aria-label={`Subir ${NOME_CAMPO[c]}`} disabled={i === 0} onClick={() => mover(i, -1)} className="grid size-8 place-items-center rounded-lg text-suave hover:bg-cartao disabled:opacity-30"><ArrowUp size={16} /></button>
              <button type="button" aria-label={`Descer ${NOME_CAMPO[c]}`} disabled={i === p.campos.length - 1} onClick={() => mover(i, 1)} className="grid size-8 place-items-center rounded-lg text-suave hover:bg-cartao disabled:opacity-30"><ArrowDown size={16} /></button>
              <button type="button" aria-label={`Tirar ${NOME_CAMPO[c]}`} disabled={p.campos.length === 1} onClick={() => mudar({ campos: p.campos.filter((x) => x !== c) })} className="grid size-8 place-items-center rounded-lg text-suave hover:bg-cartao disabled:opacity-30"><X size={16} /></button>
            </li>
          ))}
        </ol>
        {p.campos.length < 6 && (
          <div className="flex flex-wrap gap-2">
            {CAMPOS_CARTAO.filter((c) => !p.campos.includes(c)).map((c) => (
              <button key={c} type="button" onClick={() => mudar({ campos: [...p.campos, c] })} className="inline-flex h-8 items-center gap-1 rounded-full border border-dashed border-borda-forte px-3 text-xs font-semibold text-suave hover:text-texto"><Plus size={13} /> {NOME_CAMPO[c]}</button>
            ))}
          </div>
        )}
        <p className="text-sm font-medium">Tamanho dos números</p>
        <Segmentos valor={p.tamanhoFonte} opcoes={[["p", "Pequeno"], ["m", "Médio"], ["g", "Grande"]]} aoMudar={(tamanhoFonte) => mudar({ tamanhoFonte })} />
        <p className="text-sm font-medium">Estilo</p>
        <Segmentos valor={p.estiloCartao} opcoes={[["completo", "Cartão completo"], ["bordas", "Peças na borda"]]} aoMudar={(estiloCartao) => mudar({ estiloCartao })} />
        <p className="-mt-1 text-xs text-suave">{p.estiloCartao === "bordas" ? "Pílulas pequenas coladas na borda da tela; toque para ver o cartão inteiro." : "Um cartão com todos os números."}</p>
        {p.estiloCartao === "completo" && <Interruptor titulo="Fixar no centro" texto="O cartão fica sempre no meio da largura; ao arrastar, só sobe e desce." ligado={p.fixarCentro} aoMudar={(fixarCentro) => mudar({ fixarCentro })} />}
        <p className="text-sm font-medium">Tema do cartão</p>
        <Segmentos valor={p.tema} opcoes={[["app", "Igual ao app"], ["claro", "Claro"], ["escuro", "Escuro"]]} aoMudar={(tema) => mudar({ tema })} />
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Tempo na tela (Uber e 99): {p.segundosCartao} s
          <input type="range" min={4} max={60} value={p.segundosCartao} onChange={(e) => mudar({ segundosCartao: Number(e.target.value) })} className="accent-[var(--marca)]" />
          <span className="text-xs font-normal text-suave">No inDrive o cartão fica enquanto a oferta estiver aberta.</span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Opacidade da bolha: {p.opacidadeBolha}%
          <input type="range" min={30} max={100} step={5} value={p.opacidadeBolha} onChange={(e) => mudar({ opacidadeBolha: Number(e.target.value) })} className="accent-[var(--marca)]" />
        </label>
      </Bloco>

      <Bloco titulo="Avisos">
        <div className="flex flex-col divide-y divide-borda">
          <Interruptor titulo="Vibrar" texto="Um toque no verde, dois no vermelho." ligado={p.vibrar} aoMudar={(vibrar) => mudar({ vibrar })} />
          <Interruptor titulo="Bip na corrida boa" texto="Um bip curto só quando a oferta é verde." ligado={p.bip} aoMudar={(bip) => mudar({ bip })} />
          <Interruptor titulo="Falar a oferta" texto="“Verde. Dois reais e dez por quilômetro.” Sem tirar o olho da rua." ligado={p.voz} aoMudar={(voz) => mudar({ voz })} />
          <Interruptor titulo="Perguntar se aceitou" texto="Quando a oferta some sem você tocar Aceitei/Recusei. Deixa o histórico e o extrato certos." ligado={p.perguntarAceite} aoMudar={(perguntarAceite) => mudar({ perguntarAceite })} />
          <Interruptor titulo="Modo economia" texto="O leitor dorme quando o app de corrida está offline. Menos bateria e menos calor." ligado={p.economia} aoMudar={(economia) => mudar({ economia })} />
        </div>
      </Bloco>

      <Bloco titulo="Navegação" texto="App que os botões Embarque e Destino do cartão e da notificação abrem.">
        <Segmentos valor={p.appNavegacao} opcoes={[["padrao", "Padrão"], ["maps", "Google Maps"], ["waze", "Waze"], ["perguntar", "Perguntar"]]} aoMudar={(appNavegacao) => mudar({ appNavegacao })} />
      </Bloco>

      <SegurancaCorrida p={p} mudar={mudar} nativo={nativo} />

      <Bloco titulo="Base (casa)" texto="Para calcular quanto custa voltar do destino. Ligue “Contar a volta para casa” na régua.">
        {p.base ? (
          <div className="flex items-center gap-3 rounded-xl bg-ok-suave px-3 py-2.5">
            <Home size={18} className="shrink-0 text-ok" />
            <span className="min-w-0 flex-1 text-sm font-semibold [overflow-wrap:anywhere]">{p.base.nome}</span>
            <button type="button" aria-label="Tirar a base" onClick={() => mudar({ base: null })} className="grid size-8 place-items-center rounded-full hover:bg-black/5"><X size={16} /></button>
          </div>
        ) : (
          <p className="text-sm text-suave">Sem base: o Copiloto usa onde você estiver no momento da oferta.</p>
        )}
        <div className="flex gap-2">
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Endereço da base: rua, número e cidade" className="h-11 min-w-0 flex-1 rounded-xl border border-borda bg-cartao px-3 text-sm outline-none focus:border-marca" />
          <Botao
            type="button"
            variante="secundario"
            icone={Search}
            disabled={buscando || busca.trim().length < 5}
            onClick={() =>
              iniciarBusca(async () => {
                const r = await buscarEnderecoBase(busca);
                if (!r) return setAvisoBase("Não achei esse endereço. Tente com rua, número e cidade.");
                mudar({ base: r });
                setAvisoBase(null);
                setBusca("");
              })
            }
            aria-label="Buscar endereço"
          />
        </div>
        {nativo && (
          <Botao
            type="button"
            variante="secundario"
            icone={LocateFixed}
            onClick={async () => {
              try {
                const pl = plantaoNativo()!;
                await pl.pedirLocalizacao().catch(() => null);
                const { lat, lon } = await pl.definirBaseAqui();
                mudar({ base: { nome: "Onde eu estava ao marcar", lat, lon } });
                setAvisoBase(null);
              } catch {
                setAvisoBase("Não consegui a sua localização. Confira se o GPS está ligado e a permissão de localização.");
              }
            }}
          >
            Usar onde estou agora
          </Botao>
        )}
        {avisoBase && <p className="text-sm text-perigo">{avisoBase}</p>}
      </Bloco>

      <Bloco titulo="Mensagem para o passageiro" texto="Depois de aceitar, o botão “Copiar mensagem” do cartão copia este texto, pronto para colar no chat do app.">
        <textarea value={p.mensagem} onChange={(e) => mudar({ mensagem: e.target.value })} rows={3} maxLength={300} className={classeAreaTexto} />
        <div className="flex flex-wrap gap-2">
          {[["{saudacao}", "Saudação"], ["{nome}", "Nome do passageiro"], ["{tempo}", "Tempo até ele"]].map(([tag, r]) => (
            <button key={tag} type="button" onClick={() => mudar({ mensagem: `${p.mensagem} ${tag}`.trim() })} className="inline-flex h-8 items-center gap-1 rounded-full border border-borda px-3 text-xs font-semibold text-suave hover:text-texto"><Plus size={13} /> {r}</button>
          ))}
          <button type="button" onClick={() => mudar({ mensagem: MENSAGEM_PADRAO })} className="h-8 px-2 text-xs font-semibold text-marca">Restaurar padrão</button>
        </div>
        <div className="flex gap-2 rounded-xl bg-cartao-2 p-3 text-sm">
          <MessageSquareText size={17} className="mt-0.5 shrink-0 text-marca" />
          <span>{previa}</span>
        </div>
      </Bloco>

      {estado.erro && <Aviso tom="perigo">{estado.erro}</Aviso>}
      {estado.ok && <Aviso tom="ok">Ajustes salvos. A bolha recebe na próxima vez que você abrir o Aluguei.</Aviso>}
      <Botao
        tamanho="lg"
        icone={Save}
        disabled={salvando}
        className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] w-full"
        onClick={() =>
          iniciar(async () => {
            const r = await acaoSegura(() => salvarPreferenciasCopiloto(p));
            setEstado(r);
            if ("ok" in r && r.ok) router.refresh();
          })
        }
      >
        {salvando ? "Salvando…" : "Salvar ajustes"}
      </Botao>
    </div>
  );
}

/** Câmera de segurança e print das ofertas: ficam só no celular. */
function SegurancaCorrida({ p, mudar, nativo }: { p: PreferenciasCopiloto; mudar: (x: Partial<PreferenciasCopiloto>) => void; nativo: boolean }) {
  const [camera, setCamera] = useState<EstadoCamera | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    if (nativo) plantaoNativo()?.cameraEstado().then(setCamera).catch(() => null);
  }, [nativo]);
  const c = p.camera;
  return (
    <Bloco titulo="Segurança da corrida" texto="Tudo fica guardado só no seu celular. Nada é enviado para o Aluguei.">
      <Interruptor titulo="Print de cada oferta" texto="Guarda uma foto da tela de cada oferta (Galeria › Aluguei › Ofertas): comprovante para contestar valor ou corrida no app." ligado={p.printOfertas} aoMudar={(printOfertas) => mudar({ printOfertas })} />
      <div className="flex flex-col gap-2 border-t border-borda pt-3">
        <p className="text-sm font-semibold">Câmera de segurança</p>
        <p className="text-xs text-suave">Grava a corrida em arquivos curtos (Galeria › Aluguei › Corridas). Quando passa do limite, apaga os mais antigos. Gravar no próprio carro é permitido; recomendamos o adesivo “veículo monitorado por câmera”, que ajuda se o vídeo virar prova. Não publique vídeos de passageiros.</p>
        <Segmentos valor={c.lente} opcoes={[["frontal", "Frontal (interior)"], ["traseira", "Traseira"]]} aoMudar={(lente) => mudar({ camera: { ...c, lente } })} />
        <Segmentos valor={c.qualidade} opcoes={[["baixa", "360p"], ["media", "480p"], ["alta", "720p"]]} aoMudar={(qualidade) => mudar({ camera: { ...c, qualidade } })} />
        <label className="flex flex-col gap-1 text-sm font-medium">Arquivos de {c.minutosPorArquivo} min · limite {c.limiteGb} GB
          <input type="range" min={1} max={15} value={c.minutosPorArquivo} onChange={(e) => mudar({ camera: { ...c, minutosPorArquivo: Number(e.target.value) } })} className="accent-[var(--marca)]" />
          <input type="range" min={1} max={64} value={c.limiteGb} onChange={(e) => mudar({ camera: { ...c, limiteGb: Number(e.target.value) } })} className="accent-[var(--marca)]" />
        </label>
        {nativo ? (
          <Botao
            type="button"
            variante={camera?.gravando ? "perigo" : "secundario"}
            onClick={async () => {
              setErro(null);
              const pl = plantaoNativo()!;
              try {
                if (camera?.gravando) setCamera(await pl.cameraParar());
                else {
                  await pl.pedirCamera().catch(() => null);
                  setCamera(await pl.cameraIniciar());
                }
              } catch {
                setErro("Não consegui usar a câmera. Confira a permissão da câmera e salve os ajustes antes de gravar.");
              }
            }}
          >
            {camera?.gravando ? "Parar a gravação" : "Começar a gravar agora"}
          </Botao>
        ) : (
          <p className="text-xs text-suave">A gravação funciona no app do Aluguei para Android.</p>
        )}
        {camera?.gravando && <p className="text-xs text-ok">Gravando{camera.arquivos ? ` · ${camera.arquivos} arquivos` : ""}{camera.usadoMb ? ` · ${camera.usadoMb} MB` : ""}. Também dá para parar pela notificação ou pelo menu da bolha.</p>}
        {erro && <p className="text-sm text-perigo">{erro}</p>}
      </div>
    </Bloco>
  );
}
