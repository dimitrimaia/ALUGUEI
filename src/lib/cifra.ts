import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/** AES-256-GCM com a chave de CHAVE_CIFRA (64 caracteres hex). Formato: iv.tag.dados, em base64url. */
function chave(): Buffer {
  const hex = process.env.CHAVE_CIFRA;
  if (!hex || hex.length !== 64) throw new Error("CHAVE_CIFRA precisa ter 64 caracteres hexadecimais");
  return Buffer.from(hex, "hex");
}

export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave(), iv);
  const dados = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), dados].map((b) => b.toString("base64url")).join(".");
}

export function decifrar(cifrado: string): string {
  const [iv, tag, dados] = cifrado.split(".").map((p) => Buffer.from(p, "base64url"));
  if (!iv || !tag || !dados) throw new Error("Texto cifrado inválido");
  const d = createDecipheriv("aes-256-gcm", chave(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(dados), d.final()]).toString("utf8");
}
