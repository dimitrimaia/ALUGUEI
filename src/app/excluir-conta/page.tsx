import { CONTATO, PaginaLegal } from "@/components/legal/pagina-legal";

export const metadata = { title: "Excluir a conta", description: "Como pedir a exclusão da sua conta do Aluguei e dos seus dados." };

/** Página pública exigida pela Play Store: como excluir a conta e o que é apagado. */
export default function ExcluirConta() {
  const assunto = encodeURIComponent("Excluir minha conta");
  const corpo = encodeURIComponent("Quero excluir a minha conta do Aluguei.\nE-mail ou celular da conta: ");
  return (
    <PaginaLegal titulo="Excluir a sua conta" atualizada="05/11/2026">
      <h2>Pelo app</h2>
      <p>Entre na sua conta, toque em <strong>Conta → Privacidade → Pedir a exclusão da conta</strong> e envie o pedido.</p>
      <h2>Sem o app</h2>
      <p>Mande um e-mail para <a href={`mailto:${CONTATO}?subject=${assunto}&body=${corpo}`}>{CONTATO}</a> com o assunto "Excluir minha conta" e o e-mail ou celular da conta. Para a sua segurança, confirmamos o pedido pelo mesmo e-mail ou celular.</p>
      <h2>O que acontece</h2>
      <ul>
        <li>Em até 15 dias apagamos a conta: login, nome, foto, contatos, preferências, dados do Plantão e do Copiloto.</li>
        <li>Se você tem um contrato em andamento, ele precisa ser encerrado com o locador antes.</li>
        <li>Ficam guardados só o que a lei obriga: contratos, pagamentos, vistorias e registros de auditoria, pelo prazo legal (por exemplo, 5 anos para dados fiscais). Depois, são apagados.</li>
      </ul>
    </PaginaLegal>
  );
}
