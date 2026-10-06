FROM node:22-alpine
WORKDIR /app
COPY package.json server.mjs index.html style.css app.js locales.js safety.js sw.js manifest.webmanifest pokemonPersonalities.json _headers ./
COPY scripts/build.mjs ./scripts/build.mjs
COPY assets ./assets
COPY netlify/functions ./netlify/functions
RUN npm run build
ENV HOST=0.0.0.0 PORT=8080
EXPOSE 8080
CMD ["npm","start"]
