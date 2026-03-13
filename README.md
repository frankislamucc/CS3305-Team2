### 🛠 Installation & Running

**DO NOT RUN WHILE ON EDUROAM. FIREWALL WONT ALLOW YOU TO CONNECT TO MONGODB PORT**

1. **Install dependencies:** `npm install` (or `yarn`, `pnpm i`, `bun install`)

2. **Run the development server:** `npm run dev` (or `yarn dev`, `pnpm dev`, `bun dev`)

3. **Install MongoDB dependencies:** `npm add mongoose bcryptjs` `npm add -D @types/bcryptjs` `npm install mongodb` `npm add jose`

4.  **Slate cluster url:** env var `MONGODB_URI` in .env.local

5. **Install WebSocket dependencies:** `npm add socket.io socket.io-client --legacy-peer-deps`


**RUNNING WITH DOCKER (RECOMMENDED)** `docker compose up --build`