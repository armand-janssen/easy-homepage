FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install -g pnpm && pnpm install

COPY . .

USER node

EXPOSE 3000
CMD ["node", "server.js"]
