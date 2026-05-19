"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState } from "react";
import { MARKETPLACE_ABI, MARKETPLACE_ADDRESS } from "@/lib/marketplace";

// ── Read hooks ────────────────────────────────────────────────────────────────

export function useAssetListings(assetId: bigint | undefined) {
  const { data, isLoading, refetch } = useReadContract({
    address:      MARKETPLACE_ADDRESS,
    abi:          MARKETPLACE_ABI,
    functionName: "getAssetListings",
    args:         assetId !== undefined ? [assetId] : undefined,
    query:        { enabled: assetId !== undefined },
  });
  return { listings: (data as any[] | undefined) ?? [], isLoading, refetch };
}

export function useAssetOffers(assetId: bigint | undefined) {
  const { data, isLoading, refetch } = useReadContract({
    address:      MARKETPLACE_ADDRESS,
    abi:          MARKETPLACE_ABI,
    functionName: "getAssetOffers",
    args:         assetId !== undefined ? [assetId] : undefined,
    query:        { enabled: assetId !== undefined },
  });
  return { offers: (data as any[] | undefined) ?? [], isLoading, refetch };
}

export function useSellerListings(seller: `0x${string}` | undefined) {
  const { data, isLoading, refetch } = useReadContract({
    address:      MARKETPLACE_ADDRESS,
    abi:          MARKETPLACE_ABI,
    functionName: "getSellerListings",
    args:         seller ? [seller] : undefined,
    query:        { enabled: !!seller },
  });
  return { listings: (data as any[] | undefined) ?? [], isLoading, refetch };
}

export function useBuyerOffers(buyer: `0x${string}` | undefined) {
  const { data, isLoading, refetch } = useReadContract({
    address:      MARKETPLACE_ADDRESS,
    abi:          MARKETPLACE_ABI,
    functionName: "getBuyerOffers",
    args:         buyer ? [buyer] : undefined,
    query:        { enabled: !!buyer },
  });
  return { offers: (data as any[] | undefined) ?? [], isLoading, refetch };
}

export function useEscrowedShares(assetId: bigint | undefined, holder: `0x${string}` | undefined) {
  const { data } = useReadContract({
    address:      MARKETPLACE_ADDRESS,
    abi:          MARKETPLACE_ABI,
    functionName: "escrowedShares",
    args:         assetId !== undefined && holder ? [assetId, holder] : undefined,
    query:        { enabled: assetId !== undefined && !!holder },
  });
  return (data as bigint | undefined) ?? 0n;
}

export function usePendingWithdrawals(assetId: bigint | undefined, recipient: `0x${string}` | undefined) {
  const { data } = useReadContract({
    address:      MARKETPLACE_ADDRESS,
    abi:          MARKETPLACE_ABI,
    functionName: "pendingWithdrawals",
    args:         assetId !== undefined && recipient ? [assetId, recipient] : undefined,
    query:        { enabled: assetId !== undefined && !!recipient },
  });
  return (data as bigint | undefined) ?? 0n;
}

// ── Write hooks ───────────────────────────────────────────────────────────────

function useTx() {
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const { writeContractAsync, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  return { writeContractAsync, isPending, isConfirming, isSuccess, error, txHash, setTxHash };
}

export function useListShares() {
  const { writeContractAsync, isPending, isConfirming, isSuccess, error, txHash, setTxHash } = useTx();

  const listShares = async (assetId: bigint, shareAmount: bigint, pricePerShare: bigint) => {
    const hash = await writeContractAsync({
      address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: "listShares",
      args: [assetId, shareAmount, pricePerShare],
    });
    setTxHash(hash);
    return hash;
  };

  return { listShares, isPending, isConfirming, isSuccess, error, txHash };
}

export function useBuyShares() {
  const { writeContractAsync, isPending, isConfirming, isSuccess, error, txHash, setTxHash } = useTx();

  const buyShares = async (listingId: bigint, shareAmount: bigint, totalPrice: bigint) => {
    const hash = await writeContractAsync({
      address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: "buyShares",
      args: [listingId, shareAmount],
      value: totalPrice,
    });
    setTxHash(hash);
    return hash;
  };

  return { buyShares, isPending, isConfirming, isSuccess, error, txHash };
}

export function useMakeOffer() {
  const { writeContractAsync, isPending, isConfirming, isSuccess, error, txHash, setTxHash } = useTx();

  const makeOffer = async (assetId: bigint, shareAmount: bigint, pricePerShare: bigint, totalEscrow: bigint) => {
    const hash = await writeContractAsync({
      address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: "makeOffer",
      args: [assetId, shareAmount, pricePerShare],
      value: totalEscrow,
    });
    setTxHash(hash);
    return hash;
  };

  return { makeOffer, isPending, isConfirming, isSuccess, error, txHash };
}

export function useAcceptOffer() {
  const { writeContractAsync, isPending, isConfirming, isSuccess, error, txHash, setTxHash } = useTx();

  const acceptOffer = async (offerId: bigint) => {
    const hash = await writeContractAsync({
      address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: "acceptOffer",
      args: [offerId],
    });
    setTxHash(hash);
    return hash;
  };

  return { acceptOffer, isPending, isConfirming, isSuccess, error, txHash };
}

export function useCancelOffer() {
  const { writeContractAsync, isPending, isConfirming, isSuccess, error, txHash, setTxHash } = useTx();

  const cancelOffer = async (offerId: bigint) => {
    const hash = await writeContractAsync({
      address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: "cancelOffer",
      args: [offerId],
    });
    setTxHash(hash);
    return hash;
  };

  return { cancelOffer, isPending, isConfirming, isSuccess, error, txHash };
}

export function useCancelListing() {
  const { writeContractAsync, isPending, isConfirming, isSuccess, error, txHash, setTxHash } = useTx();

  const cancelListing = async (listingId: bigint) => {
    const hash = await writeContractAsync({
      address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: "cancelListing",
      args: [listingId],
    });
    setTxHash(hash);
    return hash;
  };

  return { cancelListing, isPending, isConfirming, isSuccess, error, txHash };
}

export function useDepositShares() {
  const { writeContractAsync, isPending, isConfirming, isSuccess, error, txHash, setTxHash } = useTx();

  const depositShares = async (assetId: bigint, amount: bigint) => {
    const hash = await writeContractAsync({
      address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: "depositShares",
      args: [assetId, amount],
    });
    setTxHash(hash);
    return hash;
  };

  return { depositShares, isPending, isConfirming, isSuccess, error, txHash };
}

export function useWithdrawShares() {
  const { writeContractAsync, isPending, isConfirming, isSuccess, error, txHash, setTxHash } = useTx();

  const withdrawShares = async (assetId: bigint) => {
    const hash = await writeContractAsync({
      address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: "withdrawShares",
      args: [assetId],
    });
    setTxHash(hash);
    return hash;
  };

  return { withdrawShares, isPending, isConfirming, isSuccess, error, txHash };
}
