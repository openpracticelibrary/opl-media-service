FROM node:lts
RUN apt-get update
RUN apt-get install -y graphicsmagick
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENTRYPOINT ["node", "server.js"]

