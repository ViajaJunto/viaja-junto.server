# Plano de Reuso

## Tabela de oportunidades de reuso

| Funcionalidade                    | Solução existente                                                     | Alternativas                                                                           | Decisão                                                                | Justificativa                                                                                                                                                                                                                                               | Riscos                                                                                                                                            |
| --------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catálogo de destinos e atividades | OpenStreetMap / API do Google Places                                  | Criar um catálogo local manualmente; usar um provedor de dados de viagens como Amadeus | Reutilizar a API existente e adaptar                                   | Reutilizar um catálogo externo de destinos reduz o esforço de coleta, atualização e cobertura geográfica dos dados. Também ajuda a manter a qualidade e a atualização das informações.                                                                      | Dependência de uma API externa, limite de requisições, mudanças de preço e inconsistência na localização dos dados.                               |
| Autenticação                      | Passport.js com estratégia JWT                                        | Implementar autenticação do zero; usar Auth0 ou Keycloak                               | Reutilizar Passport.js                                                 | Passport.js é um framework de autenticação bem consolidado e amplamente usado no ecossistema Node.js. Ele reduz o esforço de implementação e se integra bem com aplicações NestJS e autorização baseada em JWT.                                             | Mudanças de versão do framework, complexidade de configuração, erro no ciclo de vida do token e má configuração de segurança.                     |
| Persistência e acesso a dados     | Prisma ORM                                                            | Usar TypeORM; criar repositories manualmente; escrever SQL puro                        | Reutilizar Prisma ORM                                                  | O Prisma acelera o desenvolvimento ao fornecer schema, migrações, tipagem forte e uma camada de acesso a dados consistente. Isso reduz código repetitivo e melhora a manutenção.                                                                            | Dependência de uma ferramenta externa, complexidade na gestão de migrações e necessidade de conhecimento da equipe sobre as convenções do Prisma. |
| Validação de dados de entrada     | Zod e class-validator                                                 | Validar manualmente com JavaScript puro                                                | Reutilizar Zod e class-validator conforme o contexto                   | Essas bibliotecas reduzem a implementação manual de validações, melhoram a segurança da API e evitam inconsistências nos dados recebidos pelos endpoints. Em projetos NestJS, elas são especialmente úteis para validar DTOs, payloads e regras de negócio. | Dependência de bibliotecas externas, curva de aprendizado inicial e necessidade de manter schemas e regras atualizados.                           |
| Gestão de despesas compartilhadas | Lógica interna de domínio para divisão de despesas e cálculo de saldo | Construir um mecanismo próprio do zero; usar um pacote financeiro comercial            | Desenvolver uma biblioteca interna reutilizável e expô-la na aplicação | Essa funcionalidade é genérica o suficiente para ser reutilizada em outros cenários de colaboração além de viagens, como eventos compartilhados ou despesas domésticas. Projetá-la como biblioteca melhora independência e portabilidade.                   | Regras complexas de moeda, arredondamento e cálculo de saldo dos participantes, além de casos de borda no fechamento de dívidas.                  |

### Componente reutilizável: Biblioteca de gestão de despesas compartilhadas

Um componente do projeto que pode ser projetado para reutilização é a lógica de despesas compartilhadas usada para:

- adicionar despesas a uma viagem
- dividir custos entre participantes
- calcular saldos individuais
- identificar quem deve para quem
- aplicar regras de arredondamento e moeda

### Como torná-lo independente e reutilizável

1. Extrair a lógica de domínio da camada HTTP.
   - Manter as regras de negócio em um serviço ou pacote independente dos controllers do NestJS.

2. Definir interfaces claras.
   - Usar abstrações para moeda, participantes e itens de despesa.

3. Separar regras de negócio da persistência.
   - A biblioteca não deve depender diretamente do Prisma ou de entidades do banco.

4. Manter a API pequena e genérica.
   - Expor operações como addExpense, settleBalance e calculateSummary.

5. Empacotar como módulo reutilizável.
   - Pode virar um pacote privado ou uma biblioteca interna para futuros sistemas que precisem de controle de custos compartilhados.

6. Adicionar testes para casos de borda.
   - Incluir cenários de divisão proporcional, partes desiguais, conversão de moeda e liquidação de dívidas.

### Por que esse é um bom candidato a reuso

Esse componente não está ligado apenas ao planejamento de viagens. Ele pode ser reutilizado em:

- planejamento de eventos
- despesas em apartamento ou quarto compartilhado
- rateio de custos de equipe
- controle de compras em grupo
- gestão de orçamento de organizações locais

Ao separar a lógica do domínio da viagem, o projeto cria um ativo reutilizável que pode ser adotado por outros sistemas com pouca adaptação.
