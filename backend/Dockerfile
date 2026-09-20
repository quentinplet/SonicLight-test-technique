FROM node:24-alpine
WORKDIR /app

# Dependencies first, source after: Docker caches layers, so a code change does not reinstall
# node_modules — only a change to these two files does.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Prisma 7 no longer generates on migrate, and the client lands in src/, so tsc compiles it
# into dist/ along with the rest. Without this line the build fails on missing types.
RUN npx prisma generate && npm run build

# NODE_ENV is deliberately left to the environment: set to production here, the seed would
# refuse to run and `docker compose up` would show an empty admin view.
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
