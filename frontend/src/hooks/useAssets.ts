"use client";

import { useReadContract } from "wagmi";
import { ASSETMIND_ABI, CONTRACT_ADDRESS } from "@/lib/contract";
import type { Asset } from "@/types";

export function useAssets() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi:     ASSETMIND_ABI,
    functionName: "getAllAssets",
  });

  return {
    assets:    (data as Asset[] | undefined) ?? [],
    isLoading,
    error,
    refetch,
  };
}

export function useAsset(assetId: bigint | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address:      CONTRACT_ADDRESS,
    abi:          ASSETMIND_ABI,
    functionName: "getAsset",
    args:         assetId !== undefined ? [assetId] : undefined,
    query:        { enabled: assetId !== undefined },
  });

  return {
    asset:     data as Asset | undefined,
    isLoading,
    error,
    refetch,
  };
}

export function useTotalAssets() {
  const { data } = useReadContract({
    address:      CONTRACT_ADDRESS,
    abi:          ASSETMIND_ABI,
    functionName: "totalAssets",
  });
  return (data as bigint | undefined) ?? 0n;
}
