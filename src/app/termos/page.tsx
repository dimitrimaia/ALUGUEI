import { CONTATO, CONTROLADOR, PaginaLegal } from "@/components/legal/pagina-legal";

export const metadata = { title: "Termos de uso", description: "Regras de uso do Aluguei." };

export default function Termos() {
  return (
    <PaginaLegal titulo="Termos de uso" atualizada="05/11/2026">
      <p>Estes termos valem para o site aluguei.xyz e o app Aluguei. Ao criar uma conta, você concorda com eles. O serviço é oferecido por {CONTROLADOR}.</p>
      <h2>O que o Aluguei é</h2>
      <ul>
        <li>Uma plataforma que liga locadores de carros a motoristas de aplicativo e ajuda a administrar contratos, cobranças e vistorias.</li>
        <li>Ferramentas para o motorista: Plantão (ganhos e gastos), Copiloto (avaliação de ofertas), calculadoras e caronas.</li>
      </ul>
      <p>O Aluguei <strong>não é dono dos carros</strong> e não é parte do contrato de locação: o contrato é entre o locador e o motorista.</p>
      <h2>Sua conta</h2>
      <ul>
        <li>Você precisa ter 18 anos ou mais e dar informações verdadeiras.</li>
        <li>A conta é pessoal; cuide da sua senha e dos códigos de acesso.</li>
        <li>Podemos bloquear contas com fraude, documentos falsos ou uso que prejudique outras pessoas.</li>
        <li>Viu golpe, assédio ou anúncio falso? Use o botão <strong>Denunciar</strong> na conversa ou no anúncio. A equipe analisa cada denúncia.</li>
      </ul>
      <h2>Copiloto</h2>
      <ul>
        <li>As contas do Copiloto são estimativas a partir dos custos que você informa; a decisão de aceitar uma corrida é sempre sua.</li>
        <li>O Copiloto só lê a tela dos apps de corrida e nunca age por você. Ele não tem ligação com Uber, 99, inDrive ou 37 City.</li>
        <li>Use com segurança: não mexa no celular dirigindo.</li>
      </ul>
      <h2>Pagamentos</h2>
      <p>Cobranças por Pix são processadas pelo Asaas. A plataforma pode cobrar do locador uma mensalidade por carro, informada antes de começar.</p>
      <h2>Responsabilidades</h2>
      <p>Locador e motorista respondem pelo que combinam no contrato (carro, uso, multas, danos). O Aluguei responde pelo funcionamento da plataforma, dentro da lei.</p>
      <h2>Contato</h2>
      <p><a href={`mailto:${CONTATO}`}>{CONTATO}</a>. Foro: o do domicílio do consumidor, conforme o Código de Defesa do Consumidor.</p>
    </PaginaLegal>
  );
}
