FROM node:20-slim

WORKDIR /app

# Install all dependencies (including dev for tsc)
COPY package.json package-lock.json ./
RUN npm install

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
COPY scripts/ ./scripts/
RUN npm run build && ls -la dist/src/index.js

# Remove dev deps to shrink image
RUN npm prune --omit=dev

# Hugging Face Spaces uses port 7860 by default
ENV PORT=7860
ENV NODE_ENV=production
ENV TXLINE_BASE_URL=https://txline.txodds.com
ENV SOLANA_RPC_URL=https://api.devnet.solana.com
ENV DB_PATH=/tmp/txline_arena.json
ENV SETTLEMENT_ONCHAIN=true

# Decode devnet keypair from base64 env var at runtime
# The SOLANA_WALLET_KEYPAIR env var should contain the raw JSON array.
# SOLANA_WALLET_KEYPAIR_PATH is not needed since the code checks SOLANA_WALLET_KEYPAIR first.

EXPOSE 7860

CMD ["node", "dist/src/index.js"]
