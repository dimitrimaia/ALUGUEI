import "server-only";
import QRCode from "qrcode";
import { gerarBRCode } from "@/dominio/pix/brcode";

/** QR Code e copia e cola de um Pix direto para a chave do locador (sem gateway, sem taxa). */
export async function pixDireto(d: { chave: string; nome: string; cidade: string; valorCentavos: number; obrigacaoId: string }) {
  const copiaECola = gerarBRCode({
    chave: d.chave,
    nome: d.nome,
    cidade: d.cidade,
    valorCentavos: d.valorCentavos,
    // O identificador ajuda o locador a achar o Pix no extrato do banco.
    txid: `ALG${d.obrigacaoId.replace(/-/g, "").slice(0, 20)}`,
  });
  const imagem = await QRCode.toDataURL(copiaECola, { margin: 1, width: 448, errorCorrectionLevel: "M" });
  return { copiaECola, imagem };
}
