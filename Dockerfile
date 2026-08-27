FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json server.js index.html styles.css app.js ./
COPY src ./src
RUN npm ci --omit=dev && chown -R node:node /app
USER node
ENV NODE_ENV=production PORT=4173 HOST=0.0.0.0
EXPOSE 4173
CMD ["node", "server.js"]
