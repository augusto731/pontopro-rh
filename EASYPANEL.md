# Deploy no Easypanel com PostgreSQL interno

1. Crie um projeto, por exemplo `pontopro`.
2. Em **New Service > Postgres**, crie `banco` e escolha a base `pontopro`.
   Use uma senha forte; mantenha **Expose** desabilitado.
3. Em **Postgres > Credentials**, copie a **Internal Connection URL**.
4. No mesmo projeto, crie **App > Source > Upload** e envie o ZIP fornecido.
   Em **Build**, escolha **Dockerfile**, caminho `Dockerfile` e `Build Path` na raiz `/`.
5. Configure as variáveis do App (sem aspas):
   ```dotenv
   NODE_ENV=production
   PORT=3000
   TZ=America/Sao_Paulo
   DATABASE_URL=COLE_AQUI_A_URL_INTERNA_DO_POSTGRES
   ```
6. Em **Domains**, use HTTP, a porta de destino `3000` e um domínio HTTPS.
7. Clique em **Deploy** e verifique `https://SEU_DOMINIO/api/health`.
8. Configure Backups do Postgres, com destino fora da VPS, cron e retenção.

## Login e primeiro acesso

O acesso é feito com CPF e senha. Em uma base nova, o sistema cria somente a
configuração inicial da empresa, uma escala padrão vazia, a competência atual e
o administrador master:

- CPF: `11377082989`
- Senha inicial: `Haut125`

No primeiro acesso, será obrigatório trocar a senha. Cadastre colaboradores e
suas senhas em **Configurações > Colaboradores**; para promover um deles, use
**Configurações > Administradores**.

## Reiniciar o banco de produção

O reset substitui todo o estado atual do PontoPro: colaboradores, contas,
batidas, ausências, feriados, auditoria, fechamentos, competências e dados da
empresa. O sistema recria apenas os itens iniciais descritos acima. Faça um
backup antes de prosseguir.

Bloqueie o acesso ao App durante o reset (ou pare temporariamente o serviço,
mantendo o PostgreSQL ativo). Em um console/exec do serviço App, com
`DATABASE_URL` configurada no ambiente, execute o comando abaixo. Reinicie o
App antes de liberar o acesso. A confirmação no ambiente é obrigatória para
evitar uma limpeza acidental:

```sh
RESET_DATABASE_CONFIRM=ZERAR_BANCO_PRODUCAO npm run db:reset:production
```

O comando exibe somente os totais do banco reiniciado e o CPF master. Depois
do reset, faça novo deploy/reinicie o serviço App.

## Limitações e segurança

- Execute **apenas 1 réplica** do App, porque leituras ficam em memória.
- As rotas de RH exigem sessão autenticada; operações administrativas verificam
  o perfil de administrador no servidor. As senhas são armazenadas com hash
  scrypt e as sessões expiram após oito horas.
- Execute apenas uma réplica do App; as sessões e leituras são mantidas em memória.
- Não exponha a porta 5432 e não inclua `DATABASE_URL` em repositórios.
- Faça backups e testes de restauração; o volume é gerenciado pelo serviço Postgres.

## Nota de compatibilidade do build

Vite 8 precisa de esbuild ^0.27 || ^0.28. Este pacote usa esbuild ^0.28.0.
Se o painel estiver com fonte ZIP anterior, reenvie este ZIP e gere um novo deploy.


## Como confirmar que o novo ZIP foi usado

Este pacote tem o marcador `PONTOPRO_BUILD_20261111_V3_ESBUILD=^0.28.0` no Dockerfile.
No log do build, antes do `npm install`, deve aparecer o marcador.
Se não aparecer, o Easypanel ainda está usando o Dockerfile antigo.
Verifique Source > Upload, Save, Build Path `/`, e use Force Rebuild.
Se o log ainda acusar `esbuild ^0.25.0`, confira o package.json no código fonte realmente enviado.

## Versão V4: correção no próprio Dockerfile

O Easypanel atualizou Dockerfile mas reutilizou um package.json antigo em alguns uploads.
Por isso o V4 executa `npm pkg set "devDependencies.esbuild=^0.28.0"` DENTRO da imagem
antes de `npm install`. A linha `PONTOPRO_V4_ESBUILD=^0.28.0` deve aparecer no
log. Isto corrige o conflito de peer dependency mesmo que o Docker utilize
um package.json anterior com `^0.25.0`.

No Easypanel: Source > Upload > envie este ZIP > Save; em Build use Dockerfile
na raiz com Build Path `/`; clique em Force Rebuild. Não precisa de Console.
Não exclua o serviço PostgreSQL, nem seu volume.

Caso o pacote seja publicado e o health falhe, verifique os logs da aplicação
e o DATABASE_URL nas variáveis de ambiente do serviço.


## Versao V5 - correcoes de permissoes no runtime

O ZIP anterior incluiu arquivos com modo Unix 0600; o Docker usa USER node
(UID 1000), entao o npm nao conseguia ler /app/package.json (EACCES).

A V5 normaliza os modos no ZIP para 0644, usa COPY --chown=node:node
e garante acesso de leitura ao usuario de execucao. Durante o Docker build,
a V5 executa uma verificacao de leitura como `node` e mostra:

    PONTOPRO_V5_PERMISSIONS_OK UID=1000

Para atualizar: Easypanel > pontopro > Source > Upload > ZIP V5 > Save;
Build com Dockerfile, build path /; Force Rebuild. Nenhuma mudanca no banco.
Depois do build, consulte os logs do servico: se faltarem variaveis DATABASE_URL
ou a rede interna do PostgreSQL falhar, o proximo erro sera de inicializacao de DB.
Configure as variaveis em Environment (runtime), nao somente Build Args.

Nao exponha o app para funcionarios ou publicamente antes de implementar
autenticacao/autorizacao no backend e remover os dados demonstrativos.
