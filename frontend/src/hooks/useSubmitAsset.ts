"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ASSETMIND_ABI, CONTRACT_ADDRESS } from "@/lib/contract";
import type { SubmitAssetForm } from "@/types";

export function useSubmitAsset() {
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { writeContractAsync, isPending: isWritePending, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receipt } =
    useWaitForTransactionReceipt({ hash: txHash });

  const submit = async (form: SubmitAssetForm) => {
    const estimatedValueCents = BigInt(Math.round(parseFloat(form.estimatedValue) * 100));

    const hash = await writeContractAsync({
      address:      CONTRACT_ADDRESS,
      abi:          ASSETMIND_ABI,
      functionName: "submitAsset",
      args: [
        form.name,
        form.description,
        form.location,
        form.category,
        estimatedValueCents,
      ],
    });

    setTxHash(hash);
    return hash;
  };

  return {
    submit,
    txHash,
    isWritePending,
    isConfirming,
    isSuccess,
    receipt,
    error: writeError,
    reset: () => setTxHash(undefined),
  };
}
