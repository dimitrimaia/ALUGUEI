/** Recriado a cada troca de tela: a página nova aparece com um esmaecimento curto (só opacidade). */
export default function Transicao({ children }: { children: React.ReactNode }) {
  return <div className="entrada-tela">{children}</div>;
}
