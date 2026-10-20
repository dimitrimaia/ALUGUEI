"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useActionState, useState } from "react";
import { Aviso, Botao, Campo, classeAreaTexto, classeEntrada } from "@/components/ui";
import { comprimirImagem } from "@/lib/comprimir-imagem";
import { supabaseNavegador } from "@/lib/supabase/navegador";
import { type EstadoAnuncio, prepararFotoAnuncio, salvarAnuncio } from "../acoes";

type Foto = { caminho?: string; url: string; enviando?: boolean };

export function FormularioAnuncio({
  veiculoId,
  inicial,
  fotosIniciais,
}: {
  veiculoId: string;
  inicial: { cidade: string; uf: string; aluguelSemanal: string; caucao: string; franquiaKmMensal: number; prazoMinimoMeses: number; descricao: string };
  fotosIniciais: { caminho: string; url: string }[];
}) {
  const [estado, enviar, salvando] = useActionState<EstadoAnuncio, FormData>(salvarAnuncio.bind(null, veiculoId), {});
  const [fotos, setFotos] = useState<Foto[]>(fotosIniciais);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const e = estado.erros ?? {};

  async function adicionar(arquivos: FileList | null) {
    setErroFoto(null);
    for (const arquivo of [...(arquivos ?? [])].slice(0, 6 - fotos.length)) {
      const previa = URL.createObjectURL(arquivo);
      setFotos((f) => [...f, { url: previa, enviando: true }]);
      try {
        const pronta = await comprimirImagem(arquivo, { ladoMaximo: 1600 });
        const { caminho, token } = await prepararFotoAnuncio(veiculoId);
        const { error } = await supabaseNavegador().storage.from("anuncios").uploadToSignedUrl(caminho, token, pronta, { contentType: "image/jpeg" });
        if (error) throw error;
        setFotos((f) => f.map((x) => (x.url === previa ? { url: previa, caminho } : x)));
      } catch {
        setFotos((f) => f.filter((x) => x.url !== previa));
        setErroFoto("Uma foto não foi enviada. Tente de novo.");
      }
    }
  }

  const enviando = fotos.some((f) => f.enviando);

  return (
    <form action={enviar} className="flex flex-col gap-4">
      {estado.mensagem && <Aviso tom="perigo">{estado.mensagem}</Aviso>}
      <input type="hidden" name="fotos" value={JSON.stringify(fotos.filter((f) => f.caminho).map((f) => f.caminho))} />

      <div>
        <p className="mb-2 text-sm font-medium">Fotos ({fotos.length}/6)</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {fotos.map((f, i) => (
            <div key={f.url} className="relative aspect-square overflow-hidden rounded-xl bg-cartao-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={`Foto ${i + 1}`} className="size-full object-cover" />
              {f.enviando ? (
                <span className="absolute inset-0 grid place-items-center bg-black/30 text-white"><Loader2 size={20} className="animate-spin" /></span>
              ) : (
                <button type="button" onClick={() => setFotos((x) => x.filter((y) => y.url !== f.url))} className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/60 text-white" aria-label="Remover foto"><X size={14} /></button>
              )}
              {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[0.6rem] font-bold text-white">Capa</span>}
            </div>
          ))}
          {fotos.length < 6 && (
            <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border border-dashed border-borda-forte text-suave hover:bg-cartao-2">
              <ImagePlus size={22} />
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(ev) => { adicionar(ev.target.files); ev.target.value = ""; }} />
            </label>
          )}
        </div>
        {erroFoto && <p className="mt-1 text-xs font-medium text-perigo">{erroFoto}</p>}
      </div>

      <div className="grid grid-cols-[1fr_5rem] gap-3">
        <Campo rotulo="Cidade" erro={e.cidade}><input name="cidade" defaultValue={inicial.cidade} className={classeEntrada} required /></Campo>
        <Campo rotulo="UF" erro={e.uf}><input name="uf" defaultValue={inicial.uf} maxLength={2} className={`${classeEntrada} uppercase`} required /></Campo>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Aluguel semanal (R$)" erro={e.aluguelSemanal}><input name="aluguelSemanal" inputMode="decimal" defaultValue={inicial.aluguelSemanal} className={classeEntrada} required /></Campo>
        <Campo rotulo="Caução (R$)" erro={e.caucao}><input name="caucao" inputMode="decimal" defaultValue={inicial.caucao} className={classeEntrada} required /></Campo>
        <Campo rotulo="Franquia (km/mês)" erro={e.franquiaKmMensal}><input name="franquiaKmMensal" inputMode="numeric" defaultValue={inicial.franquiaKmMensal} className={classeEntrada} required /></Campo>
        <Campo rotulo="Prazo mínimo (meses)" erro={e.prazoMinimoMeses}><input name="prazoMinimoMeses" inputMode="numeric" defaultValue={inicial.prazoMinimoMeses} className={classeEntrada} required /></Campo>
      </div>
      <Campo rotulo="Descrição" dica="Estado do carro, se tem ar, consumo, o que está incluso." erro={e.descricao}>
        <textarea name="descricao" rows={4} defaultValue={inicial.descricao} maxLength={1500} className={classeAreaTexto} />
      </Campo>
      <Botao tamanho="lg" disabled={salvando || enviando}>{enviando ? "Enviando fotos…" : salvando ? "Salvando…" : "Publicar anúncio"}</Botao>
    </form>
  );
}
