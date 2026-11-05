# ViajaJunto — API

[![CI](https://github.com/ViajaJunto/viaja-junto.server/actions/workflows/ci.yml/badge.svg)](https://github.com/ViajaJunto/viaja-junto.server/actions/workflows/ci.yml)
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=ViajaJunto_viaja-junto.server&metric=alert_status)](https://sonarcloud.io/project/overview?id=ViajaJunto_viaja-junto.server)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=ViajaJunto_viaja-junto.server&metric=coverage)](https://sonarcloud.io/project/overview?id=ViajaJunto_viaja-junto.server)

API REST do **ViajaJunto**, um planejador de viagens colaborativo: um grupo
organiza roteiros com vários destinos, datas, atividades, orçamento e despesas
num só lugar, vê o plano no mapa e lê o que outros viajantes acharam dos
lugares. Projeto da disciplina de Construção de Software (PUCRS).

> A especificação completa (requisitos, arquitetura, modelo de dados) está em
> [`docs/`](docs/index.md), em inglês, assim como o código e os comentários.

## Sumário

- [Stack](#stack)
- [Pré-requisitos](#pré-requisitos)
- [Início rápido](#início-rápido)
- [Variáveis de ambiente (`.env`)](#variáveis-de-ambiente-env)
- [Login com Google, token de desenvolvimento e administradores](#login-com-google-token-de-desenvolvimento-e-administradores)
- [Documentação da API (Swagger / Scalar)](#documentação-da-api-swagger--scalar)
- [Visão geral dos endpoints](#visão-geral-dos-endpoints)
- [Banco de dados](#banco-de-dados)
- [Rodando tudo com Docker Compose](#rodando-tudo-com-docker-compose)
- [Fotos e armazenamento (S3)](#fotos-e-armazenamento-s3)
- [Ambiente AWS emulado (MiniStack)](#ambiente-aws-emulado-ministack)
- [Testes](#testes)
- [Qualidade e integração contínua](#qualidade-e-integração-contínua)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Comandos npm](#comandos-npm)
- [Solução de problemas](#solução-de-problemas)
- [Contribuição e equipe](#contribuição-e-equipe)

## Stack

| Camada | Tecnologia |
| ------ | ---------- |
| Runtime e framework | Node.js 22, NestJS 12, TypeScript |
| Banco de dados | PostgreSQL 17 com Prisma 7 (driver adapter `pg`) |
| Autenticação | Passport.js: login com Google (OAuth 2.0) e JWT nas rotas protegidas |
| Validação | `class-validator` nos payloads, Zod nas variáveis de ambiente |
| Arquivos | Amazon S3 (MiniStack no ambiente local) |
| Integrações externas | Google Places (atividades perto de um destino), OpenStreetMap / Nominatim (busca e importação de lugares), Wikipedia (foto reserva) |
| Segurança HTTP | Helmet, CORS por lista de origens, rate limiting por IP (`@nestjs/throttler`) |
| Documentação | OpenAPI gerado pelos decorators do `@nestjs/swagger`, exibido com Scalar |
| Testes e qualidade | Vitest (unitários e e2e), oxlint, Prettier, Spectral, SonarCloud, Trivy |
| Infraestrutura | Docker / Docker Compose, CloudFormation, MiniStack (emulador da AWS) |

A arquitetura é em módulos por funcionalidade, cada um com camadas
`domain / application / infrastructure / presentation`
([architecture §5.3](docs/architecture.md)).

## Pré-requisitos

| Ferramenta | Para quê | Obrigatória? |
| ---------- | -------- | ------------ |
| **Node.js 22** e **npm 10** | Rodar a API, os testes e os scripts | Sim |
| **Docker Desktop** (com Compose) | PostgreSQL local, stack completa e MiniStack | Sim, para o banco |
| **AWS CLI v2** (`brew install awscli`) | Só para o ambiente AWS emulado (`npm run aws:*`) | Não |
| Conta no Google Cloud | Credenciais OAuth para o login com Google; chave do Places | Não para desenvolver (veja o token de desenvolvimento) |

> **Versão do npm:** a imagem Docker usa npm 10. Versões mais novas (11+)
> reescrevem o `package-lock.json` de um jeito que o npm 10 não aceita, e o
> build da imagem quebra com `Missing: typescript@... from lock file`. Instale
> as dependências com **`npm ci`**, que nunca altera o lock, e só use
> `npm install <pacote>` quando for de fato adicionar um pacote.

## Início rápido

```bash
git clone https://github.com/ViajaJunto/viaja-junto.server.git
cd viaja-junto.server

cp .env.example .env        # depois preencha JWT_SECRET e o Google (veja abaixo)
npm ci                      # instala as dependências e roda `prisma generate`
npm run db:up               # sobe o PostgreSQL no Docker
npx prisma migrate deploy   # cria as tabelas
npm run db:seed             # opcional: destino de exemplo (Londres)
npm run start:dev           # API em http://localhost:3000/api
```

Abra **<http://localhost:3000/docs>** para a referência interativa da API e
**<http://localhost:3000/api/health>** para conferir se a API e o banco estão
de pé.

O `.env` mínimo para subir a API localmente:

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/viajajunto?schema=public"
JWT_SECRET=<saída de: openssl rand -base64 48>
GOOGLE_CLIENT_ID=placeholder.apps.googleusercontent.com   # ou o valor real
GOOGLE_CLIENT_SECRET=placeholder                          # ou o valor real
```

Com valores de mentira no Google a API sobe normalmente; só o login com Google
não funciona. Para chamar rotas protegidas sem ele, use o
[token de desenvolvimento](#sem-credenciais-do-google-token-de-desenvolvimento).

## Variáveis de ambiente (`.env`)

Todas as variáveis são validadas na inicialização por
[`src/shared/config/env.ts`](src/shared/config/env.ts) (Zod). Se alguma
obrigatória faltar ou estiver em formato errado, a API **não sobe** e mostra a
lista de problemas. O [`.env.example`](.env.example) traz todas comentadas;
copie-o para `.env`, que está no `.gitignore` e nunca deve ser commitado.

Legenda: **Obrigatória** = a API não sobe sem ela. **Opcional** = tem valor
padrão ou só desliga uma funcionalidade.

### Aplicação

| Variável | Obrigatória? | Padrão | O que é |
| -------- | ------------ | ------ | ------- |
| `NODE_ENV` | Opcional | `development` | `development`, `test` ou `production` |
| `PORT` | Opcional | `3000` | Porta HTTP da API |
| `API_PREFIX` | Opcional | `api` | Prefixo de todas as rotas (`/api/trips`) |
| `SWAGGER_PATH` | Opcional | `docs` | Caminho da documentação interativa (`/docs`) |

### Banco de dados

| Variável | Obrigatória? | Padrão | O que é |
| -------- | ------------ | ------ | ------- |
| `DATABASE_URL` | **Obrigatória** | — | Connection string do PostgreSQL. Precisa começar com `postgresql://`. O valor do `.env.example` já aponta para o banco do Docker |

### Login com Google (OAuth)

| Variável | Obrigatória? | Padrão | O que é |
| -------- | ------------ | ------ | ------- |
| `GOOGLE_CLIENT_ID` | **Obrigatória** | — | Client ID do OAuth (Google Cloud Console). Pode ser um valor de mentira para desenvolver sem login |
| `GOOGLE_CLIENT_SECRET` | **Obrigatória** | — | Client secret do OAuth. **Nunca compartilhe nem commite o valor real** |
| `GOOGLE_CALLBACK_URL` | Opcional | `http://localhost:3000/api/auth/google/callback` | Para onde o Google volta após o login. Precisa estar cadastrada como *Authorized redirect URI* no Google Cloud |
| `AUTH_REDIRECT_URL` | Opcional | `http://localhost:5173/auth/callback` | Página do frontend que recebe o token depois do login |

### Frontend (CORS)

| Variável | Obrigatória? | Padrão | O que é |
| -------- | ------------ | ------ | ------- |
| `CORS_ORIGINS` | Opcional | `http://localhost:5173` | Origens do navegador que podem chamar a API, separadas por vírgula, sem barra no final (`http://localhost:5173,https://app.exemplo.com`) |

### Tokens (JWT)

| Variável | Obrigatória? | Padrão | O que é |
| -------- | ------------ | ------ | ------- |
| `JWT_SECRET` | **Obrigatória** | — | Segredo que assina os tokens, com **pelo menos 32 caracteres**. Gere com `openssl rand -base64 48` |
| `JWT_EXPIRES_IN` | Opcional | `3600` | Validade do token, em segundos |
| `JWT_SECRET_PREVIOUS` | Opcional | — | Para trocar o `JWT_SECRET` sem deslogar todo mundo: coloque o segredo **antigo** aqui e o novo em `JWT_SECRET`. Tokens antigos valem até expirar; remova depois de `JWT_EXPIRES_IN` segundos |

### Limite de requisições (rate limiting)

Contado por IP, numa janela fixa. Acima do limite a API responde `429` com o
cabeçalho `Retry-After`.

| Variável | Obrigatória? | Padrão | O que é |
| -------- | ------------ | ------ | ------- |
| `THROTTLE_TTL_SECONDS` | Opcional | `60` | Tamanho da janela, em segundos |
| `THROTTLE_LIMIT` | Opcional | `300` | Leituras (GET) por janela |
| `THROTTLE_WRITE_LIMIT` | Opcional | `60` | Escritas (POST, PATCH, PUT, DELETE) por janela |
| `THROTTLE_STRICT_LIMIT` | Opcional | `10` | Rotas sensíveis: login, entrar numa viagem com código, upload de foto, escrever avaliação e as rotas de lugares |
| `TRUST_PROXY_HOPS` | Opcional | `0` | Quantos proxies reversos ficam na frente da API (ex.: `1` atrás de um load balancer), para ler o IP real do `X-Forwarded-For`. Deixe `0` quando os clientes conectam direto |

### Lugares: OpenStreetMap (Nominatim)

Usado pelos administradores para buscar e importar cidades e lugares
(`/places/search`, `/places/import/*`).

| Variável | Obrigatória? | Padrão | O que é |
| -------- | ------------ | ------ | ------- |
| `PLACES_USER_AGENT` | Opcional | — | Identificação exigida pela política do Nominatim, com um contato: `ViajaJunto/1.0 (voce@exemplo.com)`. **Sem ela, essas rotas respondem `503`**. Também é enviada à Wikipedia ao buscar fotos reserva |
| `PLACES_BASE_URL` | Opcional | `https://nominatim.openstreetmap.org` | Servidor do Nominatim |
| `PLACES_TIMEOUT_MS` | Opcional | `5000` | Tempo máximo de espera pelo Nominatim, em ms |

### Lugares: Google Places

Usado por `GET /destination-catalog/:id/activities`: a API responde primeiro
com o catálogo e, quando há poucas atividades, busca as mais populares no
Google Places e as copia para o catálogo, com foto e link do Maps.

| Variável | Obrigatória? | Padrão | O que é |
| -------- | ------------ | ------ | ------- |
| `GOOGLE_PLACES_API_KEY` | Opcional | — | Chave da **Places API (New)**, com faturamento ativo no projeto do Google Cloud (cada busca e cada foto é cobrada). **Sem ela, a busca externa responde `503`**; o que já está no catálogo continua sendo retornado |
| `GOOGLE_PLACES_TIMEOUT_MS` | Opcional | `10000` | Tempo máximo de espera pelo Google, em ms |

### Armazenamento de fotos (S3)

Sem `S3_BUCKET` a API sobe normalmente e só os uploads de foto respondem `503`.
As credenciais da AWS **não** ficam aqui: o SDK as lê da cadeia padrão
(variáveis `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`, papel da task no ECS ou
`~/.aws`).

| Variável | Obrigatória? | Padrão | O que é |
| -------- | ------------ | ------ | ------- |
| `AWS_REGION` | Opcional | `us-east-1` | Região do bucket |
| `S3_BUCKET` | Opcional | — | Nome do bucket das fotos |
| `S3_ENDPOINT` | Opcional | — | Endpoint customizado (MiniStack, LocalStack, MinIO). Deixe vazio na AWS real |
| `S3_PUBLIC_URL` | Opcional | — | URL que o navegador usa para abrir as fotos, com o bucket no final. Necessária quando a API acessa o S3 por um endereço interno diferente |
| `S3_FORCE_PATH_STYLE` | Opcional | `false` | `true` em emuladores, que endereçam o bucket como `host/bucket` em vez de subdomínio |

Para usar o bucket do MiniStack rodando a API com `npm run start:dev`, depois
de um `npm run aws:deploy`:

```dotenv
S3_BUCKET=viajajunto-photos-000000000000
S3_ENDPOINT=http://localhost:4566
S3_FORCE_PATH_STYLE=true
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
```

### Docker Compose

Lidas só pelo `docker-compose.yml`, não pela API.

| Variável | Padrão | O que é |
| -------- | ------ | ------- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `postgres` / `postgres` / `viajajunto` | Credenciais e nome do banco do contêiner. Devem bater com o `DATABASE_URL` |
| `POSTGRES_PORT` | `5432` | Porta do PostgreSQL no seu computador |
| `ADMINER_PORT` | `8080` | Porta do Adminer (cliente web do banco) |
| `API_PORT` | `3000` | Porta da API quando ela roda pelo Compose |
| `API_IMAGE` | `viajajunto-api:local` | Imagem da API; troque para rodar a publicada no Docker Hub |
| `MINISTACK_PORT` | `4566` | Porta do MiniStack |

### O que funciona sem as integrações opcionais

| Falta | O que acontece |
| ----- | -------------- |
| Credenciais reais do Google | A API sobe; o login com Google falha. Use o token de desenvolvimento |
| `S3_BUCKET` | Upload de foto responde `503`; o resto funciona |
| `GOOGLE_PLACES_API_KEY` | `GET /destination-catalog/:id/activities` responde só com o catálogo ou `503` quando precisaria buscar fora |
| `PLACES_USER_AGENT` | Busca e importação de lugares (`/places/*`) respondem `503` |

## Login com Google, token de desenvolvimento e administradores

### Configurando o login com Google

O Google é o **único** método de login; não existem senhas.

1. No [Google Cloud Console](https://console.cloud.google.com/), abra
   **APIs & Services → Credentials** e crie um **OAuth client ID** do tipo
   *Web application*.
2. Em **Authorized redirect URIs**, cadastre
   `http://localhost:3000/api/auth/google/callback` (tem que ser igual ao
   `GOOGLE_CALLBACK_URL`).
3. Copie o client ID e o client secret para o `.env`.

O fluxo começa em `GET /api/auth/google`, que precisa ser aberto **no
navegador** (navegação de página inteira, não `fetch`/XHR — o redirect para o
Google é bloqueado por CORS em chamadas via script, inclusive no botão "Send"
da documentação). Depois do consentimento, a API redireciona para
`AUTH_REDIRECT_URL#access_token=<jwt>&token_type=Bearer&expires_in=<s>`. As
chamadas seguintes mandam o cabeçalho `Authorization: Bearer <token>`.
`POST /api/auth/logout` invalida todos os tokens do usuário, em todos os
dispositivos.

### Sem credenciais do Google: token de desenvolvimento

Gera um token de uma hora assinado com o seu `JWT_SECRET`. O usuário é criado
no banco se o e-mail for novo, então o `DATABASE_URL` precisa apontar para o
banco da API, com as migrations aplicadas.

```bash
npm run auth:dev-token                                    # dev@viajajunto.local
npm run auth:dev-token -- alguem@exemplo.com
npm run auth:dev-token -- alguem@exemplo.com --admin      # e o torna administrador

curl -H "Authorization: Bearer $(npm run -s auth:dev-token)" http://localhost:3000/api/auth/me
```

Na documentação interativa, cole o token em **Authentication → Bearer**.

> Só para desenvolvimento: quem tem o `JWT_SECRET` consegue gerar token para
> qualquer usuário.

### Administradores

Só um administrador (`role = ADMIN`) cria, edita, apaga ou importa entradas
dos catálogos de destinos e atividades e envia as fotos delas. A API nunca
concede esse papel sozinha; promova uma conta pelo banco (ou gere um token com
`--admin`):

```sql
UPDATE "user" SET role = 'ADMIN' WHERE email = 'alguem@exemplo.com';
```

## Documentação da API (Swagger / Scalar)

Com a API rodando, a referência interativa fica em
**<http://localhost:3000/docs>** (o caminho vem de `SWAGGER_PATH`). Ela é gerada
dos decorators do código, então descreve exatamente o que a API faz: cada
endpoint, parâmetro, corpo, exemplo e código de resposta, inclusive os de
erro. Rotas com cadeado exigem `Authorization: Bearer <token>`.

Para exportar e validar o contrato, como o CI faz:

```bash
npm run openapi:generate   # compila e grava o openapi.json (com os caminhos /api/...)
npm run openapi:lint       # valida com Spectral (.spectral.yaml)
```

Convenções que valem para toda a API:

| Tema | Regra |
| ---- | ----- |
| Paginação | Listas aceitam `page` (padrão 1) e `limit` (padrão 20, máximo 100) e respondem `{ data, meta }` |
| Permissões em viagens | O criador (`OWNER`) gerencia a viagem e os membros; `EDITOR` altera destinos, atividades, orçamento e despesas; `VIEWER` só lê. Quem não participa recebe `404` |
| Catálogos | Leitura pública; escrita só para administradores (`403`) |
| Erros | Formato `{ statusCode, message, error }`; `422` lista todas as regras de validação violadas |
| Rate limiting | `429` com `Retry-After` ao passar do limite |

Códigos de status usados: `400` (UUID inválido no caminho), `401` (sem token
ou token inválido), `403` (sem permissão), `404` (não existe ou não é visível
para você), `409` (conflito: duplicado, em uso, já é membro), `413` (arquivo
grande demais), `422` (validação), `429` (limite de requisições), `502`/`504`
(provedor externo falhou ou demorou), `503` (integração opcional não
configurada, ou banco fora do ar no `/health`).

## Visão geral dos endpoints

Todos com o prefixo `/api`. Detalhes completos em `/docs`.

| Módulo | Rotas principais | Quem pode |
| ------ | ---------------- | --------- |
| Health | `GET /health` | Público |
| Auth | `GET /auth/google`, `GET /auth/google/callback`, `GET /auth/me`, `POST /auth/logout` | Público (login); usuário logado |
| Users | `GET /users`, `GET/PATCH/DELETE /users/:id`, `GET /users/me/visited-countries` | Usuário logado; alterar só a própria conta |
| Trips | CRUD em `/trips` (filtro `?status=`), `POST /trips/join`, `GET /trips/:id/invite-code`, `POST /trips/:id/invite-code/regenerate` | Membros leem; o criador edita, apaga e gerencia o código de convite |
| Trip Members | CRUD em `/trip-members` (filtro `?tripId=`) | Membros leem; o criador convida, muda permissão e remove |
| Trip Destinations | CRUD em `/trip-destinations` (filtro `?tripId=`), `PUT /trips/:tripId/destinations/order` | Membros leem; criador e `EDITOR` alteram |
| Trip Activities | CRUD em `/trip-activities` (filtro `?tripDestinationId=`) | Membros leem; criador e `EDITOR` alteram |
| Budgets | CRUD em `/budgets`, `GET /trips/:id/budget/summary` | Membros leem; criador e `EDITOR` alteram |
| Trip Expenses | CRUD em `/trip-expenses` (filtro `?tripId=`), `GET /trips/:id/expenses/summary` | Membros leem; criador e `EDITOR` alteram |
| Destination Catalog | `GET /destination-catalog` (filtros `q`, `country`, `category`), `/top`, `/:id`, `/:id/details`; POST/PATCH/DELETE; `PUT /:id/photo` | Leitura pública; escrita só administrador |
| Activity Catalog | `GET /activity-catalog` (filtros `q`, `type`, `minRating`, `city`, `country`, `destinationId`, `sort`), `/:id`, `/:id/details`; POST/PATCH/DELETE; `PUT /:id/photo` | Leitura pública; escrita só administrador |
| Places | `GET /destination-catalog/:id/activities`, `GET /places/search`, `POST /places/import/destinations`, `POST /places/import/activities` | Usuário logado (atividades); administrador (busca e importação) |
| Reviews | CRUD em `/reviews` (filtro `?activityId=`) | Leitura pública; escrever exige login; editar e apagar só o autor |
| Destination Reviews | CRUD em `/destination-reviews` (filtro `?destinationId=`) | Leitura pública; só quem fez uma viagem concluída com o destino avalia |
| Notifications | `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/read-all`, `PATCH /notifications/:id/read` | Cada usuário vê só as suas |

## Banco de dados

O schema fica em [`prisma/schema.prisma`](prisma/schema.prisma) e as migrations
em [`prisma/migrations/`](prisma/migrations). Entidades principais: `user`,
`trip`, `trip_member`, `trip_destination`, `trip_activity`, `budget`,
`trip_expense` (com `trip_expense_share`), `destination_catalog`,
`activity_catalog`, `review`, `destination_review` e `notification`. O resumo
do modelo está na [architecture §5.2](docs/architecture.md).

| Tarefa | Comando |
| ------ | ------- |
| Aplicar as migrations existentes | `npx prisma migrate deploy` |
| Criar uma migration depois de mudar o schema | `npm run prisma:migrate` |
| Apagar o banco, reaplicar tudo e rodar o seed | `npm run db:reset` |
| Dados de exemplo (destino Londres, com foto se houver S3) | `npm run db:seed` |
| Navegar nos dados | `npm run prisma:studio` ou `npm run db:admin` (Adminer em <http://localhost:8080>) |
| Ver os logs do PostgreSQL | `npm run db:logs` |

Antes de gerar uma migration, atualize sua branch com a `master`, para não
criar migrations em ordem conflitante com as de outra pessoa.

## Rodando tudo com Docker Compose

```bash
npm run stack:up                     # PostgreSQL, migrations e a API (com build)
docker compose --profile tools up -d # + Adminer em http://localhost:8080
npm run stack:logs                   # logs da API
npm run stack:down                   # derruba tudo (inclusive MiniStack e Adminer)
npm run db:nuke                      # derruba e apaga o volume do banco
```

A API responde em `http://localhost:3000/api` (`API_PORT`). O Compose lê o
mesmo `.env`; dentro da rede do Compose o banco é acessado pelo nome
`postgres`, e isso já está configurado.

## Fotos e armazenamento (S3)

Destinos e atividades do catálogo têm foto. Um administrador envia a imagem em
`PUT /api/destination-catalog/:id/photo` (ou `/activity-catalog/:id/photo`)
como `multipart/form-data`, no campo `file`:

```bash
curl -X PUT http://localhost:3000/api/destination-catalog/<id>/photo \
  -H "Authorization: Bearer $(npm run -s auth:dev-token -- admin@exemplo.com --admin)" \
  -F file=@foto.jpg
```

- Aceita JPEG, PNG e WebP de até 5 MB. O tipo é conferido pelo conteúdo do
  arquivo, não pela extensão (`422` para arquivo falso, `413` acima do tamanho).
- Cada upload grava uma chave nova (`destinations/<id>/<uuid>.jpg`), salva só a
  URL pública no banco (`photoUrl`) e só então apaga a foto anterior.
- O bucket tem leitura pública: o navegador baixa a imagem direto do S3, sem
  passar pela API.

## Ambiente AWS emulado (MiniStack)

A hospedagem na AWS (RDS, ECR, ECS, S3, Secrets Manager, IAM, CloudWatch Logs)
é reproduzida no seu computador com o [MiniStack](https://ministack.org), via
CloudFormation. Nada é cobrado e nenhuma conta da AWS é usada.

Pré-requisitos: Docker Desktop **aberto**, AWS CLI v2 e o `.env` com
`JWT_SECRET` e as variáveis do Google preenchidas (podem ser de mentira).

```bash
npm run aws:up        # sobe o MiniStack em http://localhost:4566
npm run aws:deploy    # RDS, imagem no ECR, migrations, stack do app (ECS, S3, segredos) e seed
npm run aws:status    # stacks, banco, imagens, serviço ECS, tasks paradas e bucket
npm run aws:destroy   # remove tudo o que o deploy criou (esvazia e apaga o bucket)
npm run aws:down      # remove o contêiner do MiniStack
```

A API do ECS responde em `http://localhost:3000/api` (mude com
`HOST_PORT=3001 npm run aws:deploy`). O MiniStack guarda o estado em memória:
se o contêiner reiniciar, rode `npm run aws:deploy` de novo. Templates e
scripts ficam em [`infra/`](infra); a
[architecture §9](docs/architecture.md) explica cada passo e onde o MiniStack
difere da AWS.

## Testes

```bash
npm test             # testes unitários
npm run test:cov     # com cobertura (o CI exige os mínimos do vitest.config.ts)
npm run test:e2e     # ponta a ponta, contra um PostgreSQL de verdade
```

Os testes unitários nunca acessam banco. Os **e2e** sobem a aplicação inteira
e usam um PostgreSQL real; use um banco separado, com as migrations aplicadas:

```bash
docker compose exec postgres createdb -U postgres viajajunto_test
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/viajajunto_test?schema=public"
npx prisma migrate deploy
npm run test:e2e
```

As suítes e2e rodam em paralelo no mesmo banco: cada uma cria linhas com nomes
únicos e remove exatamente essas ao terminar (`test/support`). Nunca truncam
tabelas.

## Qualidade e integração contínua

Cada pull request roda o workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml):

| Job | O que verifica |
| --- | -------------- |
| Lint | oxlint sem avisos e formatação com Prettier |
| Tests | Migrations, testes unitários com cobertura e testes e2e com PostgreSQL |
| API contract | Gera o `openapi.json` e valida com Spectral |
| SonarCloud | Análise estática e quality gate |
| Image scan | Build da imagem Docker e varredura do Trivy (falha em HIGH/CRITICAL com correção disponível) |
| Publish image | Publica no Docker Hub a partir da `master` e de tags `v*` |

Antes de abrir um PR, rode localmente:

```bash
npm run lint && npx prettier --check "src/**/*.ts" "test/**/*.ts"
npm run test:cov
npm run openapi:generate && npm run openapi:lint
```

## Estrutura do projeto

```
src/
├── main.ts, app.module.ts
├── shared/
│   ├── config/        Validação das variáveis de ambiente (Zod)
│   ├── database/      PrismaService e consultas compartilhadas (viagens visíveis, notas)
│   ├── events/        Eventos de viagem (geram notificações)
│   ├── expenses/      Biblioteca de divisão de despesas, sem framework
│   ├── http/          CORS, Helmet, rate limiting, filtros de erro, OpenAPI, DTOs comuns
│   └── storage/       Upload de fotos para o S3
└── modules/<funcionalidade>/
    ├── domain/          Entidades e contratos de repositório — sem framework, sem ORM
    ├── application/     Casos de uso (services) e DTOs
    ├── infrastructure/  Repositórios Prisma e outros adaptadores
    ├── presentation/    Controllers (rotas HTTP e documentação OpenAPI)
    └── <funcionalidade>.module.ts
prisma/      Schema, migrations, seed e imagens do seed
scripts/     Token de desenvolvimento e exportação do OpenAPI
test/        Testes e2e e utilitários
infra/       Templates CloudFormation e scripts do ambiente AWS emulado
docs/        Requisitos, arquitetura, plano de reuso e identidade visual
```

As dependências só apontam para dentro
(`presentation → application → domain ← infrastructure`); veja a
[architecture §5.3](docs/architecture.md).

## Comandos npm

| Comando | O que faz |
| ------- | --------- |
| `npm run start:dev` | API com reload a cada alteração |
| `npm run start:debug` | Idem, com o inspector do Node |
| `npm run build` / `npm run start:prod` | Compila / roda a versão compilada |
| `npm test` / `npm run test:watch` / `npm run test:cov` | Testes unitários (uma vez / modo watch / com cobertura) |
| `npm run test:e2e` | Testes ponta a ponta |
| `npm run lint` / `npm run format` | oxlint / Prettier |
| `npm run db:up` / `npm run db:down` / `npm run db:nuke` | Sobe o PostgreSQL / derruba os contêineres / derruba e apaga o volume |
| `npm run db:logs` / `npm run db:admin` | Logs do banco / Adminer |
| `npm run db:seed` / `npm run db:reset` | Dados de exemplo / recria o banco do zero |
| `npm run prisma:migrate` / `npm run prisma:generate` / `npm run prisma:studio` | Nova migration / regera o client / navega nos dados |
| `npm run auth:dev-token` | Token JWT de desenvolvimento |
| `npm run openapi:generate` / `npm run openapi:lint` | Exporta / valida o contrato OpenAPI |
| `npm run stack:up` / `npm run stack:logs` / `npm run stack:down` | Stack completa no Docker Compose |
| `npm run aws:up` / `aws:deploy` / `aws:status` / `aws:destroy` / `aws:down` | Ambiente AWS emulado |

## Solução de problemas

| Sintoma | Causa e solução |
| ------- | --------------- |
| A API não sobe e lista `Invalid environment variables` | Falta uma obrigatória ou está em formato errado no `.env` (ex.: `JWT_SECRET` com menos de 32 caracteres). A mensagem diz qual |
| `Cannot connect to the Docker daemon` | O Docker Desktop está fechado. Abra e espere iniciar (`docker ps` tem que responder) |
| Build da imagem falha com `npm ci can only install packages when your package.json and package-lock.json ... are in sync` | O `package-lock.json` foi reescrito por um npm mais novo. Restaure com `git checkout package-lock.json` e use `npm ci` |
| `port is already allocated` / a porta 3000 está ocupada | Outra API está de pé: o `api` do Compose (`docker compose stop api`) ou um `npm run start:dev` em outro terminal. Não rode a API do Compose e a do MiniStack ao mesmo tempo na mesma porta |
| `npm run aws:deploy` fica parado em "ECS: registering the task definition" | A task do ECS não consegue subir; quase sempre é a porta 3000 ocupada. Veja `npm run aws:status`, que mostra o motivo das tasks paradas |
| "Load failed" / erro de CORS ao testar `/auth/google` na documentação | Essa rota é um redirect para o Google e só funciona aberta no navegador. Use o token de desenvolvimento nas outras |
| `401` em todas as rotas depois de trocar o `JWT_SECRET` | Tokens antigos deixam de valer. Gere um novo ou use `JWT_SECRET_PREVIOUS` durante a troca |
| `403` ao criar ou editar catálogo | A conta não é administradora. Veja [Administradores](#administradores) |
| `503` no upload de foto ou nas rotas de lugares | A integração opcional não está configurada (`S3_BUCKET`, `GOOGLE_PLACES_API_KEY` ou `PLACES_USER_AGENT`) |
| `429 Too Many Requests` | Limite de requisições atingido. Espere os segundos do `Retry-After` ou aumente os `THROTTLE_*` no `.env` de desenvolvimento |

## Contribuição e equipe

Leia o [`CONTRIBUTING.md`](CONTRIBUTING.md) e o
[Código de Conduta](CODE_OF_CONDUCT.md). Em resumo: escolha uma issue,
trabalhe numa branch, mantenha a mudança pequena, adicione testes para regras
de negócio e casos de borda e abra um pull request. Código, comentários,
testes e a documentação em `docs/` são escritos em inglês.

| Integrante | GitHub |
| ---------- | ------ |
| Gustavo de Freitas Fidélis | [@gustavofid](https://github.com/gustavofid) |
| Bernardo Lykawka Medeiros da Silva | [@BernardoLykawka](https://github.com/BernardoLykawka) |
