# Usa uma imagem base oficial do Node.js
FROM node:20

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia o restante dos arquivos da aplicação
COPY . .

# Expõe a porta que o app escuta
EXPOSE 3001

# Comando para rodar o app
CMD ["node", "src/app.js"]
