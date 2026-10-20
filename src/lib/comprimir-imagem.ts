/**
 * Reduz fotos no próprio celular antes do envio (RNF-021): lado maior de até
 * 1600 px, JPEG 0,82. Uma foto de 4 MB vira ~300 KB, o que faz diferença no 4G.
 * PDFs e arquivos que não são imagem passam direto.
 */
export async function comprimirImagem(
  arquivo: File,
  { ladoMaximo = 1600, qualidade = 0.82, carimbo }: { ladoMaximo?: number; qualidade?: number; carimbo?: string } = {},
): Promise<File> {
  if (!arquivo.type.startsWith("image/")) return arquivo;
  const imagem = await createImageBitmap(arquivo);
  const escala = Math.min(1, ladoMaximo / Math.max(imagem.width, imagem.height));
  const largura = Math.round(imagem.width * escala);
  const altura = Math.round(imagem.height * escala);
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(imagem, 0, 0, largura, altura);
  imagem.close();
  if (ctx && carimbo) {
    // Carimbo visível de data, hora e local (RF-041), além dos metadados guardados no servidor.
    const fonte = Math.max(14, Math.round(largura / 45));
    ctx.font = `600 ${fonte}px system-ui, sans-serif`;
    const altFaixa = fonte * 1.9;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, altura - altFaixa, largura, altFaixa);
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText(carimbo, fonte * 0.8, altura - altFaixa / 2);
  }
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", qualidade));
  if (!blob || (!carimbo && blob.size >= arquivo.size)) return arquivo;
  return new File([blob], arquivo.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}
