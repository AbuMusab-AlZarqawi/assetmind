export const ASSETMIND_ABI = [
  // ── Write ──────────────────────────────────────────────────────────────
  {
    name: "submitAsset",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name",           type: "string"  },
      { name: "description",    type: "string"  },
      { name: "location",       type: "string"  },
      { name: "category",       type: "uint8"   },
      { name: "estimatedValue", type: "uint256" },
    ],
    outputs: [{ name: "assetId", type: "uint256" }],
  },
  {
    name: "transferShares",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assetId", type: "uint256" },
      { name: "to",      type: "address" },
      { name: "amount",  type: "uint256" },
    ],
    outputs: [],
  },
  // ── Read ───────────────────────────────────────────────────────────────
  {
    name: "getAsset",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "assetId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id",                type: "uint256" },
          { name: "owner",             type: "address" },
          { name: "name",              type: "string"  },
          { name: "description",       type: "string"  },
          { name: "location",          type: "string"  },
          { name: "category",          type: "uint8"   },
          { name: "estimatedValue",    type: "uint256" },
          { name: "aiValuation",       type: "uint256" },
          { name: "riskScore",         type: "uint8"   },
          { name: "aiReport",          type: "string"  },
          { name: "valuationComplete", type: "bool"    },
          { name: "sharesSupply",      type: "uint256" },
          { name: "submittedAt",       type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "getAllAssets",
    type: "function",
    stateMutability: "view",
    inputs:  [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "id",                type: "uint256" },
          { name: "owner",             type: "address" },
          { name: "name",              type: "string"  },
          { name: "description",       type: "string"  },
          { name: "location",          type: "string"  },
          { name: "category",          type: "uint8"   },
          { name: "estimatedValue",    type: "uint256" },
          { name: "aiValuation",       type: "uint256" },
          { name: "riskScore",         type: "uint8"   },
          { name: "aiReport",          type: "string"  },
          { name: "valuationComplete", type: "bool"    },
          { name: "sharesSupply",      type: "uint256" },
          { name: "submittedAt",       type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "getShareBalance",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "assetId", type: "uint256" }, { name: "holder", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "totalAssets",
    type: "function",
    stateMutability: "view",
    inputs:  [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // ── Events ─────────────────────────────────────────────────────────────
  {
    name: "AssetSubmitted",
    type: "event",
    inputs: [
      { name: "assetId",        type: "uint256", indexed: true  },
      { name: "owner",          type: "address", indexed: true  },
      { name: "name",           type: "string",  indexed: false },
      { name: "category",       type: "uint8",   indexed: false },
      { name: "estimatedValue", type: "uint256", indexed: false },
    ],
  },
  {
    name: "ValuationComplete",
    type: "event",
    inputs: [
      { name: "assetId",      type: "uint256", indexed: true  },
      { name: "aiValuation",  type: "uint256", indexed: false },
      { name: "riskScore",    type: "uint8",   indexed: false },
      { name: "aiReport",     type: "string",  indexed: false },
    ],
  },
] as const;

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const ASSET_CATEGORIES = ["Property", "Land", "Art", "Vehicle", "Other"] as const;
export type AssetCategory = typeof ASSET_CATEGORIES[number];
