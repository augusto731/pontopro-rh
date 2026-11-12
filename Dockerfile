# PontoPro RH — build V5: dependencia + permissao de runtime
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY package*.json ./
# Compatibilidade com Vite 8, inclusive se o painel reutilizar package.json antigo.
RUN npm pkg set "devDependencies.esbuild=^0.28.0" \
    && node -e "const p=require('./package.json'); console.log('PONTOPRO_V5_ESBUILD=' + p.devDependencies.esbuild)" \
    && npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-bookworm-slim
ENV NODE_ENV=production
ENV PORT=3000
ENV TZ=America/Sao_Paulo
WORKDIR /app
# --chown evita EACCES: o usuario node precisa ler o codigo e executar tsx.
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/server.ts ./server.ts
COPY --chown=node:node --from=builder /app/src ./src
COPY --chown=node:node --from=builder /app/dist ./dist
# Arquivos do ZIP anterior chegavam como 0600. Garante leitura e travessia dos diretorios
# para o proprietario node sem executar como root em producao.
RUN chmod -R u+rwX /app
USER node
# Falha no build caso o mesmo problema de permissao permaneça.
RUN node -e "const fs=require('fs'); for (const file of ['package.json','server.ts','src/server/db.ts','dist/index.html']) fs.accessSync(file, fs.constants.R_OK); console.log('PONTOPRO_V5_PERMISSIONS_OK UID='+process.getuid())"
EXPOSE 3000
CMD ["npm", "start"]
