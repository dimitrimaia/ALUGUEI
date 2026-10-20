/**
 * Reduz fotos no próprio celular antes do envio (RNF-021): lado maior de até
 * 1600 px, JPEG 0,82. Uma foto de 4 MB vira ~300 KB, o que faz diferença no 4G.
 * PDFs e arquivos que não são imagem passam direto.
 */
export async function comprimirImagem(arquivo: File, ladoMaximo = 1600, qualidade = 0.82): Promise<File> {
  if (!arquivo.type.startsWith("image/")) return arquivo;
  const imagem = await createImageBitmap(arquivo);
  const escala = Math.min(1, ladoMaximo / Math.max(imagem.width, imagem.height));
  const largura = Math.round(imagem.width * escala);
  const altura = Math.round(imagem.height * escala);
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  canvas.getContext("2d")?.drawImage(imagem, 0, 0, largura, altura);
  imagem.close();
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", qualidade));
  if (!blob || blob.size >= arquivo.size) return arquivo;
  return new File([blob], arquivo.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}
