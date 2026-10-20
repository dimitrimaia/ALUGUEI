import { respostaIcone } from "@/lib/icone";

const TAMANHOS = new Set(["192", "512", "512-mascaravel"]);

export function generateStaticParams() {
  return [...TAMANHOS].map((tamanho) => ({ tamanho }));
}

export async function GET(_: Request, { params }: { params: Promise<{ tamanho: string }> }) {
  const { tamanho } = await params;
  if (!TAMANHOS.has(tamanho)) return new Response("não encontrado", { status: 404 });
  return respostaIcone(Number.parseInt(tamanho, 10), { mascaravel: tamanho.endsWith("mascaravel") });
}
