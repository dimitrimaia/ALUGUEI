/** Versão publicada agora (o app compara com a dele para saber se precisa recarregar). */
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({ versao: process.env.NEXT_PUBLIC_VERSAO ?? "local" }, { headers: { "cache-control": "no-store" } });
}
