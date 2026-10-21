/**
 * Ao trocar de modo, a pessoa continua na "mesma" tela do outro lado quando
 * ela existe (Conta, Conversas, Meus carros); senão, vai para o início do modo.
 */
export function telaNoOutroModo(caminho: string, para: "motorista" | "locador"): string {
  const [base, resto = ""] = para === "locador" ? ["/painel", caminho.replace(/^\/m/, "")] : ["/m", caminho.replace(/^\/painel/, "")];
  const conta = resto.match(/^\/conta(\/[a-z]+)?/);
  if (conta) return conta[1] === "/locadora" && para === "motorista" ? "/m/conta" : `${base}/conta${conta[1] ?? ""}`;
  if (resto.startsWith("/conversas")) return `${base}/conversas`;
  if (/^\/(carros?|veiculos)(\/|$)/.test(resto)) return para === "locador" ? "/painel/veiculos" : "/m/carros?aba=anunciados";
  return base;
}
