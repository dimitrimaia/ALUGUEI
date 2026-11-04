"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Aviso, Botao, Campo, Cartao, classeEntrada } from "@/components/ui";
import { comprimirImagem } from "@/lib/comprimir-imagem";
import { enviarCadastro, type EstadoCadastro } from "./acoes";

const FOTOS = [
  { campo: "cnh", rotulo: "CNH: o PDF da CNH Digital (melhor) ou a foto aberta, frente e verso", obrigatorio: true },
  { campo: "comprovanteEndereco", rotulo: "Comprovante de endereço", obrigatorio: true },
  { campo: "comprovanteApp", rotulo: "Print do seu perfil no Uber ou 99", obrigatorio: true },
  { campo: "identidade", rotulo: "Documento de identidade (opcional, a CNH já vale)", obrigatorio: false },
] as const;

export function FormularioCadastro({
  locatarioId,
  inicial,
  consentimentos,
}: {
  locatarioId: string;
  inicial: { nome: string; email: string };
  consentimentos: { id: string; texto: string }[];
}) {
  const [estado, enviar] = useActionState<EstadoCadastro, FormData>(enviarCadastro.bind(null, locatarioId), {});
  const [enviando, iniciar] = useTransition();
  const [fotos, setFotos] = useState<Record<string, File>>({});
  const [endereco, setEndereco] = useState({ logradouro: "", bairro: "", cidade: "", uf: "" });
  const formRef = useRef<HTMLFormElement>(null);
  const e = estado.erros ?? {};

  async function buscarCep(cep: string) {
    const d = cep.replace(/\D/g, "");
    if (d.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await r.json();
      if (!j.erro) setEndereco({ logradouro: j.logradouro ?? "", bairro: j.bairro ?? "", cidade: j.localidade ?? "", uf: j.uf ?? "" });
    } catch {
      // Sem internet ou ViaCEP fora: o motorista digita o endereço.
    }
  }

  function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    for (const f of FOTOS) {
      dados.delete(f.campo);
      if (fotos[f.campo]) dados.set(f.campo, fotos[f.campo]!);
    }
    iniciar(() => enviar(dados));
  }

  return (
    <form ref={formRef} onSubmit={aoEnviar} className="flex flex-col gap-4">
      {estado.mensagem && <Aviso tom="perigo">{estado.mensagem}</Aviso>}
      {Object.keys(e).length > 0 && <Aviso tom="perigo">Confira os campos marcados.</Aviso>}

      <Cartao className="flex flex-col gap-4">
        <p className="font-semibold">Dados pessoais</p>
        <Campo rotulo="Nome completo" erro={e.nome}>
          <input name="nome" defaultValue={inicial.nome} autoComplete="name" className={classeEntrada} required />
        </Campo>
        <Campo rotulo="CPF" erro={e.cpf}>
          <input name="cpf" inputMode="numeric" placeholder="000.000.000-00" className={classeEntrada} required />
        </Campo>
        <Campo rotulo="Data de nascimento" erro={e.dataNascimento}>
          <input name="dataNascimento" type="date" className={classeEntrada} required />
        </Campo>
        <Campo rotulo="E-mail (opcional)" erro={e.email}>
          <input name="email" type="email" defaultValue={inicial.email} autoComplete="email" className={classeEntrada} />
        </Campo>
      </Cartao>

      <Cartao className="flex flex-col gap-4">
        <p className="font-semibold">Endereço</p>
        <Campo rotulo="CEP" erro={e.cep}>
          <input name="cep" inputMode="numeric" autoComplete="postal-code" className={classeEntrada} onBlur={(ev) => buscarCep(ev.target.value)} required />
        </Campo>
        <Campo rotulo="Rua" erro={e.logradouro}>
          <input name="logradouro" value={endereco.logradouro} onChange={(ev) => setEndereco({ ...endereco, logradouro: ev.target.value })} className={classeEntrada} required />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Número" erro={e.numero}>
            <input name="numero" className={classeEntrada} required />
          </Campo>
          <Campo rotulo="Complemento">
            <input name="complemento" className={classeEntrada} />
          </Campo>
        </div>
        <Campo rotulo="Bairro" erro={e.bairro}>
          <input name="bairro" value={endereco.bairro} onChange={(ev) => setEndereco({ ...endereco, bairro: ev.target.value })} className={classeEntrada} required />
        </Campo>
        <div className="grid grid-cols-[1fr_5rem] gap-3">
          <Campo rotulo="Cidade" erro={e.cidade}>
            <input name="cidade" value={endereco.cidade} onChange={(ev) => setEndereco({ ...endereco, cidade: ev.target.value })} className={classeEntrada} required />
          </Campo>
          <Campo rotulo="UF" erro={e.uf}>
            <input name="uf" maxLength={2} value={endereco.uf} onChange={(ev) => setEndereco({ ...endereco, uf: ev.target.value })} className={`${classeEntrada} uppercase`} required />
          </Campo>
        </div>
      </Cartao>

      <Cartao className="flex flex-col gap-4">
        <p className="font-semibold">CNH</p>
        <Campo rotulo="Número de registro" erro={e.cnhNumero}>
          <input name="cnhNumero" inputMode="numeric" className={classeEntrada} required />
        </Campo>
        <Campo rotulo="Data da 1ª habilitação" dica="Fica no campo “1ª habilitação”, não é a data de emissão." erro={e.cnhPrimeiraHabilitacao}>
          <input name="cnhPrimeiraHabilitacao" type="date" className={classeEntrada} required />
        </Campo>
        <Campo rotulo="Validade" erro={e.cnhValidade}>
          <input name="cnhValidade" type="date" className={classeEntrada} required />
        </Campo>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="cnhTemEar" value="sim" className="mt-1" />
          <span>Minha CNH tem a observação <strong>EAR</strong> (Exerce Atividade Remunerada)</span>
        </label>
      </Cartao>

      <Cartao className="flex flex-col gap-4">
        <p className="font-semibold">Fotos dos documentos</p>
        <p className="-mt-2 rounded-xl bg-marca-suave p-3 text-xs text-texto">
          <strong>Aprovação mais rápida:</strong> no app <strong>Carteira Digital de Trânsito</strong>, abra a sua CNH, toque em <strong>Exportar</strong> e envie o PDF aqui. Ele tem um QR Code oficial que o locador confere na hora.
        </p>
        {FOTOS.map((f) => (
          <Campo key={f.campo} rotulo={f.rotulo} erro={e[f.campo]} dica={fotos[f.campo] ? `Pronto · ${Math.round(fotos[f.campo]!.size / 1024)} KB` : undefined}>
            <input
              type="file"
              accept="image/*,application/pdf"
              className="w-full rounded-xl border border-dashed border-borda-forte bg-cartao-2 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-marca file:px-3 file:py-2 file:font-semibold file:text-marca-texto"
              required={f.obrigatorio}
              onChange={async (ev) => {
                const arquivo = ev.target.files?.[0];
                if (!arquivo) return;
                const pronto = await comprimirImagem(arquivo);
                setFotos((atual) => ({ ...atual, [f.campo]: pronto }));
              }}
            />
          </Campo>
        ))}
      </Cartao>

      <Cartao className="flex flex-col gap-3">
        <p className="font-semibold">Autorizações</p>
        {consentimentos.map((c) => (
          <label key={c.id} className="flex items-start gap-2 text-sm">
            <input type="checkbox" name={`consentimento.${c.id}`} value="sim" className="mt-1" required />
            <span>{c.texto}</span>
          </label>
        ))}
        {e.consentimentos && <span className="text-xs" style={{ color: "var(--perigo)" }}>{e.consentimentos}</span>}
      </Cartao>

      <Botao tamanho="lg" disabled={enviando} className="sticky bottom-4 shadow-flutuante">
        {enviando ? "Enviando…" : "Enviar cadastro"}
      </Botao>
    </form>
  );
}
