# AssetMind ◈

**Real World Asset tokenization with TEE-attested onchain AI valuation — built on Ritual Chain Testnet.**

AssetMind lets users submit any real world asset (property, land, art, vehicle) and receive an AI valuation report + risk score (1–100) generated synchronously onchain by Ritual Chain's native LLM precompile (`0x0802`), running **GLM-4.7-FP8 inside a TEE**. No external APIs. No oracles. One transaction.

---

## Stack

| Layer        | Tech                                              |
|------------- |---------------------------------------------------|
| Smart Contract | Solidity 0.8.20, Hardhat                        |
| AI Valuation | Ritual Chain LLM Precompile `0x0802` (GLM-4.7-FP8 in TEE) |
| Chain        | Ritual Chain Testnet · Chain ID: 1979            |
| Frontend     | Next.js 14, TypeScript, Tailwind CSS             |
| Web3 hooks   | wagmi v2, viem                                   |
| Wallet UI    | RainbowKit                                       |
| Animation    | Framer Motion                                    |
| Deploy       | Vercel (frontend) + Hardhat (contracts)          |

---

## Project structure

```
assetmind/
├── contracts/               # Hardhat project
│   ├── contracts/
│   │   ├── AssetMind.sol    # Main contract
│   │   └── utils/
│   │       └── PrecompileConsumer.sol  # Ritual Chain base
│   ├── scripts/
│   │   └── deploy.ts
│   ├── hardhat.config.ts
│   ├── .env.example
│   └── package.json
└── frontend/                # Next.js 14 app
    ├── src/
    │   ├── app/             # App router pages + global CSS
    │   ├── components/      # UI components
    │   ├── hooks/           # wagmi hooks
    │   ├── lib/             # contract ABI, wagmi config
    │   └── types/           # TypeScript types
    ├── .env.example
    └── package.json
```

---

## Prerequisites

- Node.js 18+ and npm
- MetaMask with Ritual Chain Testnet added:
  - **RPC:** `https://rpc.ritualfoundation.org`
  - **Chain ID:** `1979`
  - **Symbol:** `RITUAL`
  - **Explorer:** `https://explorer.ritualfoundation.org`
- RITUAL testnet tokens in your wallet
- A WalletConnect Project ID (free at [cloud.walletconnect.com](https://cloud.walletconnect.com))

---

## Step 1 — Set up and deploy the contract

### 1a. Install dependencies

```powershell
cd contracts
npm install
```

### 1b. Create your `.env` file

```powershell
copy .env.example .env
```

Open `.env` and paste your MetaMask private key:

```
PRIVATE_KEY=your_private_key_here
```

> ⚠️ Your private key is never committed — `.env` is in `.gitignore`.

### 1c. Compile the contract

```powershell
npm run compile
```

### 1d. Deploy to Ritual Chain Testnet

```powershell
npm run deploy
```

The output will show your deployed contract address. **Copy it** — you need it in Step 2.

```
═══════════════════════════════════════════════════
  ✅ AssetMind deployed!
  Address: 0xYOUR_CONTRACT_ADDRESS
═══════════════════════════════════════════════════
  📋 Copy these into your frontend/.env.local:

  NEXT_PUBLIC_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS
```

---

## Step 2 — Set up the frontend

### 2a. Install dependencies

```powershell
cd ../frontend
npm install
```

### 2b. Create your `.env.local` file

```powershell
copy .env.example .env.local
```

Open `.env.local` and fill in:

```
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
NEXT_PUBLIC_CHAIN_ID=1979
NEXT_PUBLIC_RPC_URL=https://rpc.ritualfoundation.org
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

### 2c. Run locally

```powershell
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Step 3 — Deploy frontend to Vercel

### Option A — Vercel CLI

```powershell
npm install -g vercel
vercel
```

Follow the prompts. When asked for the root directory, enter `frontend`.

### Option B — Vercel Dashboard (GitHub)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your repo
3. Set **Root Directory** to `frontend`
4. Add these **Environment Variables** in the Vercel dashboard:
   - `NEXT_PUBLIC_CONTRACT_ADDRESS`
   - `NEXT_PUBLIC_CHAIN_ID` = `1979`
   - `NEXT_PUBLIC_RPC_URL` = `https://rpc.ritualfoundation.org`
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
5. Click **Deploy**

---

## How the AI valuation works

When a user submits an asset:

1. `submitAsset()` is called on the contract
2. The contract builds a structured prompt with the asset details
3. `_executePrecompile(0x0802, prompt)` fires Ritual Chain's native **LLM precompile**
4. **GLM-4.7-FP8** runs inside a TEE (Trusted Execution Environment) — fully onchain, no external APIs
5. The LLM returns a JSON completion **synchronously in the same call frame**
6. The contract parses the JSON, stores:
   - `aiValuation` — AI's USD valuation
   - `riskScore` — 1 (lowest) to 100 (highest)
   - `aiReport` — 2-3 sentence professional summary
7. 1,000,000 fractional ERC-20 shares are minted to the submitter
8. `ValuationComplete` event is emitted

Everything happens in **one transaction**. The TEE attestation is implicit — Ritual Chain's consensus guarantees the model ran inside the TEE.

---

## Useful commands

```powershell
# contracts/
npm run compile        # Compile Solidity
npm run deploy         # Deploy to Ritual Testnet
npm run test           # Run Hardhat tests
npm run clean          # Clear build artifacts

# frontend/
npm run dev            # Local dev server (localhost:3000)
npm run build          # Production build
npm run start          # Serve production build
npm run lint           # ESLint
```

---

## Environment variables reference

### `contracts/.env`

| Variable      | Description                           |
|---------------|---------------------------------------|
| `PRIVATE_KEY` | MetaMask wallet private key (no 0x)   |

### `frontend/.env.local`

| Variable                              | Description                                          |
|---------------------------------------|------------------------------------------------------|
| `NEXT_PUBLIC_CONTRACT_ADDRESS`        | Deployed AssetMind contract address                  |
| `NEXT_PUBLIC_CHAIN_ID`                | `1979` (Ritual Chain Testnet)                        |
| `NEXT_PUBLIC_RPC_URL`                 | `https://rpc.ritualfoundation.org`                   |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`| From [cloud.walletconnect.com](https://cloud.walletconnect.com) |

---

## Resources

- [Ritual Chain Docs](https://docs.ritualfoundation.org)
- [Ritual Chain Explorer](https://explorer.ritualfoundation.org)
- [RainbowKit Docs](https://www.rainbowkit.com)
- [wagmi v2 Docs](https://wagmi.sh)
