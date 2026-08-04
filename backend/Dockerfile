# 1. Mude a imagem base de 'alpine' para 'slim' (baseada em Debian)
FROM node:18-slim

# 2. Instala as dependências para Debian/Ubuntu usando apt-get
RUN apt-get update \
    && apt-get install -yq --no-install-recommends \
    # Pacotes essenciais para o Chromium que o Puppeteer baixa
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libcairo2 libcups2 libdbus-1-3 \
    libdrm2 libexpat1 libgbm1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 \
    libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libx11-6 \
    libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 \
    libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 fonts-liberation \
    # Limpa o cache
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

# Instala o Puppeteer, que vai baixar sua própria versão compatível do Chrome
RUN npm install

COPY . .

EXPOSE 3000
CMD ["node", "index.js"]