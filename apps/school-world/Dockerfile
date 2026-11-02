FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/src/student-data.js ./src/student-data.js
COPY --from=build /app/src/i18n.jsx ./src/i18n.jsx
COPY --from=build /app/.env.example ./.env.example
EXPOSE 3001
CMD ["node", "server/index.js"]
