> **Deploy Easypanel + PostgreSQL:** veja [`EASYPANEL.md`](./EASYPANEL.md). Esta versão utiliza persistência PostgreSQL em JSONB e requer `DATABASE_URL` para iniciar.

# PontoPro Enterprise — Sistema de RH e Ponto Eletrônico (Portaria MTP 671/2021)

Sistema completo de controle de jornada, quiosque para tablet, espelho de ponto A4 em paisagem, banco de horas mensal com liquidação e exportação Excel.

---

## 🚀 Como Rodar Localmente

1. **Instalar Dependências:**
   ```bash
   npm install
   ```

2. **Executar em Modo Desenvolvimento (Full-Stack na Porta 3000):**
   ```bash
   npm run dev
   ```
   Acesse: `http://localhost:3000`

3. **Executar Testes Unitários de Cálculo CLT:**
   ```bash
   npx tsx src/services/runTests.ts
   ```

4. **Gerar Build de Produção:**
   ```bash
   npm run build
   ```

---

## 🌐 Como Subir em Produção: Netlify vs. HostGator vs. Render

### ⚠️ Ponto Crítico de Arquitetura:
O PontoPro é uma aplicação **Full-Stack** (React 19 no Frontend + Servidor Node.js Express no Backend).
O servidor Node.js é **obrigatório por lei (Portaria 671/2021)** para:
- Garantir o **horário oficial de Brasília (`America/Sao_Paulo`)**, impedindo que o colaborador manipule o relógio do dispositivo;
- Gerar sob demanda **PDFs A4 em Paisagem** (`pdfkit`), pacotes ZIP em lote e planilhas **Excel (.xlsx)**;
- Persistir as batidas, tolerâncias CLT e a **trilha de auditoria imutável**.

---

### Opção 1: HostGator

A forma de hospedar no HostGator depende do plano contratado:

#### A) Se o seu plano for HostGator VPS ou Servidor Dedicado (Recomendado):
1. Conecte-se ao servidor via SSH:
   ```bash
   ssh root@seu-ip-hostgator
   ```
2. Instale o Node.js v20+ e o PM2 (gerenciador de processos):
   ```bash
   npm install -g pm2
   ```
3. Clone ou faça upload dos arquivos do projeto na pasta `/var/www/pontopro`.
4. Instale as dependências e faça o build:
   ```bash
   npm install
   npm run build
   ```
5. Inicie a aplicação com o PM2 para mantê-la rodando 24/7 com reinício automático:
   ```bash
   pm2 start "npx tsx server.ts" --name "pontopro"
   pm2 save
   pm2 startup
   ```
6. No Nginx ou Apache do HostGator, crie um Reverse Proxy da porta `80/443` para `http://127.0.0.1:3000`.

#### B) Se o seu plano for Hospedagem Compartilhada cPanel (Plano P, M ou Turbo):
1. Acesse o **cPanel** do HostGator.
2. Na seção **Software**, clique em **"Setup Node.js App"** (ou "Configurar Aplicativo Node.js").
3. Clique em **"Create Application"**:
   - **Node.js version**: Selecione a versão mais recente disponível (v18 ou v20).
   - **Application mode**: `Production`.
   - **Application root**: caminho da pasta onde você enviou os arquivos (ex: `pontopro`).
   - **Application URL**: seu domínio ou subdomínio (ex: `ponto.suaempresa.com.br`).
   - **Application startup file**: `server.ts` (ou o arquivo transpilado `dist-server/server.js`).
4. Envie os arquivos do projeto via Gerenciador de Arquivos ou Git.
5. Clique em **"Run NPM Install"** e depois no botão **"Start / Restart"**.

---

### Opção 2: Netlify

O Netlify é excelente para sites estáticos / frontends JAMstack. Como o PontoPro possui um servidor Node.js com endpoints de cálculo e PDFs:

#### Estratégia Recomendada para o Netlify (Frontend no Netlify + Backend no Render/Railway):
1. **Frontend no Netlify**:
   - Suba o repositório no Netlify.
   - Build Command: `npm run build`
   - Publish directory: `dist`
   - O arquivo `netlify.toml` já está configurado no projeto para garantir os redirecionamentos de rotas SPA.
2. **Backend**:
   - Para que o quiosque, a gravação de ponto, a geração de PDFs e os cálculos CLT funcionem, suba o backend (pasta do projeto) em um serviço com suporte nativo a Node.js persistente, como o **Render** ou **Railway**.

---

### Opção 3: Render.com ou Railway (Alternativa Mais Rápida e Moderna)

Se você procura a solução mais simples com SSL automático e suporte nativo a Node.js full-stack:
1. Crie uma conta gratuita em [Render.com](https://render.com) ou [Railway.app](https://railway.app).
2. Clique em **New Web Service** e conecte seu repositório GitHub.
3. Configure:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Variável de Ambiente**: `PORT=3000`, `TZ=America/Sao_Paulo`
4. O deploy é finalizado em menos de 2 minutos com link HTTPS pronto para uso!
