# Stage 1: Build
FROM node:22-alpine AS build

WORKDIR /app

# Abhängigkeiten kopieren und installieren
COPY package*.json ./
RUN npm ci

# Quellcode kopieren und bauen
COPY . .
RUN npm run build:prod

# Stage 2: Serve
FROM nginx:alpine

# Nginx Konfiguration kopieren
COPY ../nginx.conf /etc/nginx/conf.d/default.conf

# Build Artefakte vom Build Stage kopieren
# Angular 17+ nutzt standardmäßig dist/<project-name>/browser
COPY --from=build /app/dist/arc42-3d-space/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
