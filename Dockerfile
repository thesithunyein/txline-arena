FROM node:20-slim

WORKDIR /app

# Install all dependencies (including dev for tsc)
COPY package.json package-lock.json ./
RUN npm install

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY keypair.json ./
RUN npm run build && ls -la dist/src/index.js

# Remove dev deps to shrink image
RUN npm prune --omit=dev

# Hugging Face Spaces uses port 7860 by default
ENV PORT=7860
ENV NODE_ENV=production
ENV TXLINE_BASE_URL=https://txline.txodds.com
ENV SOLANA_RPC_URL=https://api.devnet.solana.com
ENV DB_PATH=/tmp/txline_arena.json
ENV SOLANA_WALLET_KEYPAIR_PATH=/app/keypair.json
ENV SETTLEMENT_ONCHAIN=true

EXPOSE 7860

CMD ["node", "dist/src/index.js"]
