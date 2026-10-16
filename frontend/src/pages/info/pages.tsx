import { brand } from '@/config/brand';
import { InfoPage } from './InfoPage';

/*
 * Textos institucionais DEMONSTRATIVOS. Escritos para ilustrar a loja; não
 * substituem políticas reais revisadas por profissionais.
 */

export function ContactPage() {
  return (
    <InfoPage
      title="Contato"
      intro="Os canais abaixo são fictícios e servem para ilustrar como a loja apresentaria o atendimento."
    >
      <section>
        <h2>Atendimento</h2>
        <ul>
          <li>E-mail: {brand.contact.email} (endereço de exemplo, não recebe mensagens)</li>
          <li>Horário: segunda a sexta, das 9h às 18h</li>
          <li>Base: {brand.contact.city}</li>
        </ul>
      </section>
      <section>
        <h2>Por que não há formulário?</h2>
        <p>
          Um formulário de contato precisaria enviar mensagens de verdade. Como esta é uma loja de
          demonstração, preferimos não exibir um formulário que não funciona.
        </p>
      </section>
    </InfoPage>
  );
}

export function ShippingPage() {
  return (
    <InfoPage
      title="Entrega"
      intro="Como funcionariam prazos e valores de frete em uma operação real."
    >
      <section>
        <h2>Prazos</h2>
        <p>
          Os pedidos seriam separados em até 2 dias úteis após a confirmação do pagamento. O prazo
          de transporte varia conforme a região e seria informado no checkout.
        </p>
      </section>
      <section>
        <h2>Valores</h2>
        <p>
          O frete é calculado por uma regra simples e configurável, definida na fase de carrinho
          e pedidos do projeto. O valor aparece no carrinho antes da finalização da compra.
        </p>
      </section>
      <section>
        <h2>Acompanhamento</h2>
        <p>
          O status de cada pedido ficaria disponível na área do cliente, com as etapas de
          separação, envio e entrega.
        </p>
      </section>
    </InfoPage>
  );
}

export function ReturnsPage() {
  return (
    <InfoPage
      title="Trocas e devoluções"
      intro="Regras de exemplo para troca e devolução, inspiradas nas práticas comuns do comércio eletrônico no Brasil."
    >
      <section>
        <h2>Direito de arrependimento</h2>
        <p>
          Em compras feitas pela internet, o Código de Defesa do Consumidor (art. 49) garante a
          desistência em até 7 dias corridos a partir do recebimento, com devolução integral do
          valor pago.
        </p>
      </section>
      <section>
        <h2>Trocas por tamanho ou cor</h2>
        <ul>
          <li>Solicitação em até 30 dias após o recebimento.</li>
          <li>A peça precisa estar sem sinais de uso e com a etiqueta.</li>
          <li>A troca depende da disponibilidade em estoque.</li>
        </ul>
      </section>
      <section>
        <h2>Produtos com defeito</h2>
        <p>
          Peças com defeito seriam trocadas ou reembolsadas, com o frete de devolução por conta da
          loja.
        </p>
      </section>
    </InfoPage>
  );
}

export function PrivacyPage() {
  return (
    <InfoPage
      title="Política de privacidade"
      intro="Quais dados a loja coleta, para que servem e como são protegidos, em linha com a LGPD (Lei 13.709/2018)."
    >
      <section>
        <h2>Dados coletados</h2>
        <ul>
          <li>Cadastro: nome e e-mail, usados para login e comunicação sobre pedidos.</li>
          <li>Pedidos: itens, valores e endereço de entrega.</li>
          <li>
            Pagamentos: processados pelo Stripe. A loja não recebe nem armazena dados de cartão.
          </li>
        </ul>
      </section>
      <section>
        <h2>Uso e compartilhamento</h2>
        <p>
          Os dados seriam usados apenas para processar pedidos e prestar atendimento, e
          compartilhados somente com os serviços necessários para isso (pagamento e entrega).
        </p>
      </section>
      <section>
        <h2>Seus direitos</h2>
        <p>
          A LGPD garante o acesso, a correção e a exclusão dos seus dados, entre outros direitos.
        </p>
      </section>
      <section>
        <h2>Nesta demonstração</h2>
        <p>
          O ambiente de demonstração usa pagamentos em modo de teste e não deve receber dados
          pessoais reais.
        </p>
      </section>
    </InfoPage>
  );
}
