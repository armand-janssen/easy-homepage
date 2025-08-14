FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

VOLUME ["/app/public/icons", "/data"]

ENV SITES_JSON_PATH=/data/sites.json

EXPOSE 3000
CMD ["node", "server.js"]
