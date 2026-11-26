FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx ng build

FROM nginx:alpine
# nginx config is mounted by docker-compose (infra/nginx/default.conf)
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80
