FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci --build-from-source

COPY . .

EXPOSE 5050

CMD ["npm", "start"]
