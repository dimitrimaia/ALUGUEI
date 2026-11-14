import { CONTATO, CONTROLADOR, PaginaLegal } from "@/components/legal/pagina-legal";

export const metadata = { title: "Política de privacidade", description: "Como o Aluguei trata os seus dados pessoais (LGPD)." };

export default function Privacidade() {
  return (
    <PaginaLegal titulo="Política de privacidade" atualizada="11/11/2026">
      <p>Esta política explica quais dados o Aluguei (site aluguei.xyz e app para Android) usa, para quê e quais são os seus direitos pela Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).</p>

      <h2>Quem é o controlador</h2>
      <p>{CONTROLADOR}. Contato do encarregado de dados: <a href={`mailto:${CONTATO}`}>{CONTATO}</a>.</p>

      <h2>Dados que usamos</h2>
      <ul>
        <li><strong>Conta:</strong> nome, e-mail, celular, foto de perfil e senha (guardada de forma cifrada pelo provedor de login).</li>
        <li><strong>Cadastro para alugar um carro:</strong> CPF, data de nascimento, endereço, dados e fotos da CNH, comprovante de endereço e print do perfil no app de corrida. Só a locadora com quem você se cadastrou vê esses documentos.</li>
        <li><strong>Contrato e pagamentos:</strong> contrato, vistorias e check-ins (fotos e vídeos do carro), cobranças e pagamentos. Os pagamentos por Pix são processados pelo Asaas.</li>
        <li><strong>Plantão e Copiloto (motorista):</strong> ganhos, gastos, km do painel e as ofertas de corrida avaliadas (valor, distâncias, tempos, nota e endereços que o app de corrida mostra).</li>
        <li><strong>Localização:</strong> só com o Copiloto ligado, para calcular a volta até a sua base e o botão "Definir base aqui". Não guardamos o seu trajeto.</li>
        <li><strong>Mensagens:</strong> conversas com locadores e com o suporte.</li>
        <li><strong>Técnicos:</strong> registros de erro do app (sem o conteúdo das telas) e o aparelho que recebe notificações.</li>
      </ul>

      <h2>O Copiloto e a acessibilidade</h2>
      <p>No Android, o Copiloto usa o serviço de acessibilidade <strong>apenas para ler, na tela dos apps de corrida suportados (Uber, 99, inDrive e 37 City), os dados da oferta</strong>: valor, distâncias e tempos; nome do passageiro, quando aparece; endereços de embarque, paradas e destino; outras informações do passageiro (nota, número de corridas, forma de pagamento); e as suas ações na oferta (se aceitou ou recusou, a contraproposta e quando a corrida começou e terminou). Com isso ele mostra se a corrida compensa pelos custos do seu carro, avisa lugares a evitar e registra o seu histórico.</p>
      <ul>
        <li>Na Uber, que esconde o texto da oferta, o Copiloto lê a imagem da tela para achar esses mesmos dados. A leitura é feita no próprio celular e a imagem fica só na memória: não é guardada nem enviada.</li>
        <li>Ele não lê outros apps e <strong>nunca toca, aceita, recusa ou oferece tarifa por você</strong>.</li>
        <li>Só funciona com o Copiloto ligado; você desliga quando quiser no app ou nas configurações do Android.</li>
        <li>Os números das ofertas vão para a sua conta, para o histórico e as estatísticas.</li>
      </ul>

      <h2>Câmera de segurança e prints</h2>
      <p>Se você ligar, a câmera de segurança da corrida e o print de cada oferta ficam <strong>só no seu celular</strong>. Nada disso é enviado ao Aluguei.</p>

      <h2>Para que usamos</h2>
      <ul>
        <li>Criar e proteger a sua conta (execução do contrato e segurança).</li>
        <li>Permitir que a locadora analise o seu cadastro e administre o contrato (execução do contrato).</li>
        <li>Cobrar e dar baixa nos pagamentos (execução do contrato e obrigação legal).</li>
        <li>Mostrar as contas do Plantão e do Copiloto para você (execução do contrato).</li>
        <li>Avisos importantes (pagamento, check-in, mensagens) e, se você deixar, novidades (consentimento).</li>
        <li>Resolver erros e evitar fraude (legítimo interesse).</li>
      </ul>

      <h2>Com quem compartilhamos</h2>
      <ul>
        <li>A <strong>locadora</strong> com quem você aluga (cadastro, contrato, pagamentos e vistorias).</li>
        <li>Prestadores que fazem o serviço funcionar: hospedagem (Vercel), banco de dados e login (Supabase), pagamentos (Asaas), mapas (OpenStreetMap/Photon e OSRM, só endereços para calcular rotas) e envio de e-mails e notificações.</li>
        <li>Autoridades, quando a lei exigir.</li>
      </ul>
      <p>Não vendemos os seus dados.</p>

      <h2>Por quanto tempo</h2>
      <p>Enquanto a conta existir. Ao excluir a conta, apagamos os dados de login e do perfil. Contratos, pagamentos, vistorias e registros de auditoria ficam guardados pelo prazo que a lei exige (por exemplo, fiscal e civil) e depois são apagados.</p>

      <h2>Seus direitos</h2>
      <p>Você pode pedir acesso, correção, cópia, exclusão, saber com quem compartilhamos e retirar o consentimento. Escreva para <a href={`mailto:${CONTATO}`}>{CONTATO}</a>. Para excluir a conta, veja <a href="/excluir-conta">aluguei.xyz/excluir-conta</a>.</p>

      <h2>Segurança</h2>
      <p>Acesso cifrado (HTTPS), controle de acesso por conta, documentos guardados em área privada e registro das ações sensíveis.</p>

      <h2>Menores de idade</h2>
      <p>O Aluguei é para maiores de 18 anos.</p>

      <h2>Mudanças</h2>
      <p>Se esta política mudar, avisamos no app antes de valer.</p>
    </PaginaLegal>
  );
}
