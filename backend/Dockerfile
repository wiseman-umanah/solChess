FROM node:22-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm exec prisma generate --schema prisma/schema

EXPOSE 3001

CMD ["pnpm", "exec", "tsx", "src/server.ts"]
