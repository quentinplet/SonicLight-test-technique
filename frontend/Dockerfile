FROM node:24-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# VITE_* variables are inlined at build time, never read at runtime: the API URL has to be
# known here, which is why this image is for local demonstration and not for deployment.
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build-only

# `vite preview` serves the built files and falls back to index.html on deep links. It is a
# demonstration server, not a production one — in production the CDN serves dist/ directly.
EXPOSE 4173
CMD ["npm", "run", "preview", "--", "--host", "--port", "4173"]
