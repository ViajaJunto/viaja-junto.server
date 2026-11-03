# Roteiro da demo — MiniStack e S3 no ViajaJunto

Duração: uns 4 minutos, 6 passos, só sobre o S3, logo depois do slide 9 ("O MiniStack emula a AWS no nosso computador").
O script `infra/demo.sh` faz tudo: em cada passo ele mostra o que falar, o comando, roda e espera um Enter.

## Antes da apresentação (no dia anterior e de novo 30 min antes)

1. Atualize o repositório e instale as dependências:
   ```bash
   git checkout master && git pull
   npm ci
   ```
2. Confira o `.env`: `JWT_SECRET` com 32+ caracteres; `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` podem ser os de mentira.
3. Libere a porta 3000: `docker compose stop api` (o `api` do docker compose não pode estar de pé).
4. Suba o ambiente do zero (leva alguns minutos por causa do build da imagem):
   ```bash
   npm run aws:up
   npm run aws:destroy && npm run aws:deploy
   ```
5. Ensaie sem pausas para ver se está tudo certo:
   ```bash
   DEMO_AUTO=1 npm run aws:demo
   ```
6. Depois do ensaio, rode `npm run aws:destroy && npm run aws:deploy` de novo, para a apresentação começar com a foto original de Londres.
7. Deixe o terminal com fonte grande (Cmd +) e um navegador aberto.

## Durante a apresentação

```bash
npm run aws:demo
```

Se precisar recomeçar de um passo: `DEMO_FROM=3 npm run aws:demo`.

| Passo | O que aparece | O que falar |
| ----- | ------------- | ----------- |
| 1. O bucket | `aws s3 ls`, a política JSON e a foto `seed.jpg` | Este é o nosso S3, rodando no MiniStack com o AWS CLI oficial. A política libera só `s3:GetObject` para todo mundo: ler é público, gravar não. A "pasta" `destinations/<id>/` é só prefixo da chave. |
| 2. Leitura pública | O destino Londres com `photoUrl` e um `HEAD` com 200 `image/jpeg` | O banco guarda só a URL; o navegador baixa a foto direto do S3. A foto abre no navegador (no Mac abre sozinha). |
| 3. Upload pela API | `PUT /destination-catalog/:id/photo` devolvendo um `photoUrl` novo | Só administrador altera o catálogo; o script cria um admin de demonstração e assina um token com o `JWT_SECRET`. |
| 4. O que mudou | A chave nova (UUID), `Cache-Control: immutable` e a foto antiga com 404 | Chave nova a cada upload: a foto nunca muda e pode ficar em cache para sempre. A antiga só foi apagada depois que o banco apontou para a nova. |
| 5. Proteção | 401 sem token, 422 para um texto renomeado como `.jpg` | Ninguém grava no bucket direto: só a API, que confere o tipo real pelos bytes. |
| 6. URL pré-assinada | Bucket privado temporário e a URL assinada funcionando | Para arquivos privados, URL que expira. Falar com franqueza: a leitura sem assinatura deu 200 porque o MiniStack não aplica esse bloqueio; na AWS daria 403. |

## Se algo der errado

| Sintoma | O que fazer |
| ------- | ----------- |
| "MiniStack fora do ar" | `npm run aws:up` e, se o ambiente foi perdido, `npm run aws:deploy` |
| "Stack viajajunto-app não existe" | `npm run aws:deploy` (o MiniStack guarda tudo em memória e perde ao reiniciar) |
| "A API não responde" | `npm run aws:status`; confira se a porta 3000 está livre (`docker compose stop api`; não use `stack:down`, que derruba o MiniStack junto) |
| Upload responde 403 | O admin de demonstração não foi criado; rode de novo a partir do passo 3: `DEMO_FROM=3 npm run aws:demo` |
| Upload responde 401 | O `JWT_SECRET` do `.env` mudou depois do deploy; rode `npm run aws:deploy` de novo |
| Tudo travou ao vivo | Mostre os slides 8 e 9 e explique o fluxo; a demo é um complemento |

## Depois

```bash
npm run aws:destroy   # remove stacks, imagens, bucket e banco
npm run aws:down      # remove o contêiner do MiniStack
```
