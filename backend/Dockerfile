FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npm run db:generate

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npm run db:migrate:deploy && npm start"]
