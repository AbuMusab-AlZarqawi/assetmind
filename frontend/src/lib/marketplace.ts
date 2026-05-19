export const MARKETPLACE_ABI = [
  // ── Write ──────────────────────────────────────────────────────────────
  {
    name: "listShares",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assetId",       type: "uint256" },
      { name: "shareAmount",   type: "uint256" },
      { name: "pricePerShare", type: "uint256" },
    ],
    outputs: [{ name: "listingId", type: "uint256" }],
  },
  {
    name: "cancelListing",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "listingId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "buyShares",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "listingId",   type: "uint256" },
      { name: "shareAmount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "makeOffer",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "assetId",       type: "uint256" },
      { name: "shareAmount",   type: "uint256" },
      { name: "pricePerShare", type: "uint256" },
    ],
    outputs: [{ name: "offerId", type: "uint256" }],
  },
  {
    name: "acceptOffer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "offerId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "cancelOffer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "offerId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "depositShares",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assetId", type: "uint256" },
      { name: "amount",  type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "withdrawShares",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "assetId", type: "uint256" }],
    outputs: [],
  },
  // ── Read ───────────────────────────────────────────────────────────────
  {
    name: "getListing",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "listingId", type: "uint256" }],
    outputs: [{
      name: "", type: "tuple",
      components: [
        { name: "listingId",     type: "uint256" },
        { name: "assetId",       type: "uint256" },
        { name: "seller",        type: "address" },
        { name: "shareAmount",   type: "uint256" },
        { name: "pricePerShare", type: "uint256" },
        { name: "active",        type: "bool"    },
        { name: "createdAt",     type: "uint256" },
      ],
    }],
  },
  {
    name: "getAssetListings",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "assetId", type: "uint256" }],
    outputs: [{
      name: "", type: "tuple[]",
      components: [
        { name: "listingId",     type: "uint256" },
        { name: "assetId",       type: "uint256" },
        { name: "seller",        type: "address" },
        { name: "shareAmount",   type: "uint256" },
        { name: "pricePerShare", type: "uint256" },
        { name: "active",        type: "bool"    },
        { name: "createdAt",     type: "uint256" },
      ],
    }],
  },
  {
    name: "getAssetOffers",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "assetId", type: "uint256" }],
    outputs: [{
      name: "", type: "tuple[]",
      components: [
        { name: "offerId",       type: "uint256" },
        { name: "assetId",       type: "uint256" },
        { name: "buyer",         type: "address" },
        { name: "shareAmount",   type: "uint256" },
        { name: "pricePerShare", type: "uint256" },
        { name: "active",        type: "bool"    },
        { name: "accepted",      type: "bool"    },
        { name: "createdAt",     type: "uint256" },
        { name: "expiresAt",     type: "uint256" },
      ],
    }],
  },
  {
    name: "getSellerListings",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "seller", type: "address" }],
    outputs: [{
      name: "", type: "tuple[]",
      components: [
        { name: "listingId",     type: "uint256" },
        { name: "assetId",       type: "uint256" },
        { name: "seller",        type: "address" },
        { name: "shareAmount",   type: "uint256" },
        { name: "pricePerShare", type: "uint256" },
        { name: "active",        type: "bool"    },
        { name: "createdAt",     type: "uint256" },
      ],
    }],
  },
  {
    name: "getBuyerOffers",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "buyer", type: "address" }],
    outputs: [{
      name: "", type: "tuple[]",
      components: [
        { name: "offerId",       type: "uint256" },
        { name: "assetId",       type: "uint256" },
        { name: "buyer",         type: "address" },
        { name: "shareAmount",   type: "uint256" },
        { name: "pricePerShare", type: "uint256" },
        { name: "active",        type: "bool"    },
        { name: "accepted",      type: "bool"    },
        { name: "createdAt",     type: "uint256" },
        { name: "expiresAt",     type: "uint256" },
      ],
    }],
  },
  {
    name: "escrowedShares",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "assetId", type: "uint256" }, { name: "holder", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "pendingWithdrawals",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "assetId", type: "uint256" }, { name: "recipient", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "accumulatedFees",
    type: "function",
    stateMutability: "view",
    inputs:  [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "FEE_BPS",
    type: "function",
    stateMutability: "view",
    inputs:  [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // ── Events ─────────────────────────────────────────────────────────────
  {
    name: "Listed",
    type: "event",
    inputs: [
      { name: "listingId",     type: "uint256", indexed: true  },
      { name: "assetId",       type: "uint256", indexed: true  },
      { name: "seller",        type: "address", indexed: true  },
      { name: "shareAmount",   type: "uint256", indexed: false },
      { name: "pricePerShare", type: "uint256", indexed: false },
    ],
  },
  {
    name: "ListingSold",
    type: "event",
    inputs: [
      { name: "listingId",  type: "uint256", indexed: true  },
      { name: "assetId",    type: "uint256", indexed: true  },
      { name: "buyer",      type: "address", indexed: true  },
      { name: "shareAmount",type: "uint256", indexed: false },
      { name: "totalPrice", type: "uint256", indexed: false },
      { name: "fee",        type: "uint256", indexed: false },
    ],
  },
  {
    name: "OfferMade",
    type: "event",
    inputs: [
      { name: "offerId",       type: "uint256", indexed: true  },
      { name: "assetId",       type: "uint256", indexed: true  },
      { name: "buyer",         type: "address", indexed: true  },
      { name: "shareAmount",   type: "uint256", indexed: false },
      { name: "pricePerShare", type: "uint256", indexed: false },
    ],
  },
  {
    name: "OfferAccepted",
    type: "event",
    inputs: [
      { name: "offerId",     type: "uint256", indexed: true  },
      { name: "assetId",     type: "uint256", indexed: true  },
      { name: "seller",      type: "address", indexed: true  },
      { name: "shareAmount", type: "uint256", indexed: false },
      { name: "totalPrice",  type: "uint256", indexed: false },
      { name: "fee",         type: "uint256", indexed: false },
    ],
  },
] as const;

export const MARKETPLACE_ADDRESS = (
  process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || "0x0000000000000000000000000000000000000000"
) as `0x${string}`;

export const FEE_PERCENT = 2.5;
