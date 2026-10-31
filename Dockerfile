# syntax=docker/dockerfile:1

# ---------- Base común ----------
FROM node:24-alpine AS base
WORKDIR /app
# OpenSSL es necesario para que Prisma cargue su motor de consultas
RUN apk add --no-cache openssl

# ---------- Etapa 1: build ----------
# Dependencias completas (incluye TypeScript y el CLI de Prisma), cliente de Prisma y compilación
FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- Imagen de migraciones (docker build --target migrate) ----------
# Incluye el CLI de Prisma, que la imagen de runtime no lleva. Se ejecuta como
# tarea única dentro de la VPC (llega a RDS) antes de desplegar el servicio.
FROM build AS migrate
ENV NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false
USER node
CMD ["npx", "prisma", "migrate", "deploy"]

# ---------- Etapa 2: runtime ----------
FROM base AS runtime

ENV NODE_ENV=production \
    PORT=3001

# Solo dependencias de producción (sin TypeScript, tsx, nodemon ni el CLI de Prisma).
# prisma es devDependency y peer opcional de @prisma/client ("devOptional"): hay que omitir los tres.
# --ignore-scripts evita el postinstall (prisma generate), que necesita el CLI.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --omit=optional --omit=peer --ignore-scripts && npm cache clean --force

# Cliente de Prisma generado y código compilado (incluye los comentarios JSDoc que usa Swagger)
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist

# Usuario sin privilegios incluido en la imagen oficial de Node
USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# node directamente (sin npm) para que SIGTERM llegue al proceso
CMD ["node", "dist/index.js"]
