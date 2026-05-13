"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { useSubmitAsset } from "@/hooks/useSubmitAsset";
import type { SubmitAssetForm, AssetCategoryEnum } from "@/types";

const CATEGORIES = ["Property", "Land", "Art", "Vehicle", "Other"] as const;

const CATEGORY_ICONS: Record<string, string> = {
  Property: "⬡",
  Land:     "◈",
  Art:      "◇",
  Vehicle:  "◻",
  Other:    "○",
};

const DEFAULT_FORM: SubmitAssetForm = {
  name:           "",
  description:    "",
  location:       "",
  category:       0,
  estimatedValue: "",
};

interface Props {
  onSuccess: () => void;
}

export function SubmitAssetForm({ onSuccess }: Props) {
  const { isConnected } = useAccount();
  const [form, setForm]     = useState<SubmitAssetForm>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Partial<SubmitAssetForm>>({});

  const { submit, isWritePending, isConfirming, isSuccess, error, txHash, reset } = useSubmitAsset();

  const validate = (): boolean => {
    const e: Partial<SubmitAssetForm> = {};
    if (!form.name.trim())           e.name           = "Required";
    if (!form.description.trim())    e.description    = "Required";
    if (!form.location.trim())       e.location       = "Required";
    if (!form.estimatedValue || parseFloat(form.estimatedValue) <= 0)
                                     e.estimatedValue = "Must be > 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      await submit(form);
    } catch (err) {
      console.error("Submit failed:", err);
    }
  };

  const handleReset = () => {
    setForm(DEFAULT_FORM);
    setErrors({});
    reset();
    onSuccess();
  };

  const isLoading = isWritePending || isConfirming;

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card-vault rounded-none p-8 text-center"
      >
        <div className="w-16 h-16 mx-auto mb-6 relative">
          <div className="absolute inset-0 border-2 border-gold animate-ping opacity-30" style={{ transform: "rotate(45deg)" }} />
          <div className="absolute inset-2 border border-gold" style={{ transform: "rotate(45deg)" }} />
          <span className="absolute inset-0 flex items-center justify-center text-gold text-2xl">✓</span>
        </div>
        <h3 className="font-display text-2xl text-gold mb-3 font-light tracking-wide">
          Asset Tokenized
        </h3>
        <p className="text-mist text-sm mb-2 font-body">
          AI valuation completed on Ritual Chain via TEE precompile.
        </p>
        {txHash && (
          <a
            href={`https://explorer.ritualfoundation.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block font-mono text-xs text-gold hover:text-gold-lt transition-colors mt-2 mb-6 underline underline-offset-4"
          >
            {txHash.slice(0, 10)}…{txHash.slice(-8)} ↗
          </a>
        )}
        <br />
        <button onClick={handleReset} className="btn-gold px-8 py-3 rounded-none mt-4">
          TOKENIZE ANOTHER ASSET
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0  }}
      transition={{ duration: 0.5 }}
      className="card-vault rounded-none p-8"
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold opacity-20" />
          <span className="font-mono text-[10px] tracking-[0.25em] text-gold uppercase">New Submission</span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold opacity-20" />
        </div>
        <h2 className="font-display text-3xl font-light text-platinum mt-4 tracking-wide">
          Tokenize a Real World Asset
        </h2>
        <p className="text-mist text-sm mt-2 font-body leading-relaxed">
          Submit your asset for TEE-attested AI valuation by Ritual Chain's native LLM precompile.
          The AI report and risk score are stored permanently onchain.
        </p>
      </div>

      <div className="space-y-6">
        {/* Asset Name */}
        <Field label="ASSET NAME" error={errors.name}>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Manhattan Penthouse, 1957 Ferrari 250 GT"
            className="input-vault w-full px-4 py-3 rounded-none text-sm font-body"
          />
        </Field>

        {/* Category */}
        <div>
          <label className="block font-mono text-[10px] tracking-[0.2em] text-mist mb-3 uppercase">
            Category
          </label>
          <div className="grid grid-cols-5 gap-2">
            {CATEGORIES.map((cat, idx) => (
              <button
                key={cat}
                type="button"
                onClick={() => setForm(f => ({ ...f, category: idx as AssetCategoryEnum }))}
                className={`py-3 px-2 text-center transition-all duration-200 rounded-none text-xs font-body ${
                  form.category === idx
                    ? "bg-gold text-obsidian font-semibold"
                    : "border border-border text-mist hover:border-gold hover:text-platinum"
                }`}
              >
                <div className="text-base mb-1">{CATEGORY_ICONS[cat]}</div>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <Field label="LOCATION" error={errors.location}>
          <input
            type="text"
            value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            placeholder="e.g. New York, USA"
            className="input-vault w-full px-4 py-3 rounded-none text-sm font-body"
          />
        </Field>

        {/* Estimated Value */}
        <Field label="ESTIMATED VALUE (USD)" error={errors.estimatedValue}>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gold font-mono text-sm">$</span>
            <input
              type="number"
              value={form.estimatedValue}
              onChange={e => setForm(f => ({ ...f, estimatedValue: e.target.value }))}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="input-vault w-full pl-8 pr-4 py-3 rounded-none text-sm font-mono"
            />
          </div>
        </Field>

        {/* Description */}
        <Field label="DESCRIPTION" error={errors.description}>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Describe the asset in detail — condition, provenance, unique features..."
            rows={4}
            className="input-vault w-full px-4 py-3 rounded-none text-sm font-body resize-none"
          />
        </Field>

        {/* AI Notice */}
        <div className="border border-gold/10 bg-gold/5 p-4 flex gap-3">
          <span className="text-gold mt-0.5 shrink-0">◈</span>
          <p className="text-xs text-mist leading-relaxed font-body">
            Upon submission, Ritual Chain's LLM precompile at <span className="font-mono text-gold">0x0802</span> will
            analyse your asset synchronously inside a TEE. The AI valuation, risk score (1–100), and full
            report are stored permanently onchain in the same transaction.
          </p>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{   opacity: 0, height: 0 }}
              className="border border-red-500/30 bg-red-500/5 px-4 py-3 text-red-400 text-xs font-mono"
            >
              {(error as Error).message?.slice(0, 200) || "Transaction failed"}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        {!isConnected ? (
          <div className="text-center py-4 text-mist text-sm font-body">
            Connect your wallet to submit an asset.
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="btn-gold w-full py-4 rounded-none tracking-widest relative overflow-hidden"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-3">
                <span className="w-4 h-4 border border-obsidian/40 border-t-obsidian rounded-full animate-spin" />
                {isWritePending ? "AWAITING SIGNATURE…" : "PROCESSING ON RITUAL CHAIN…"}
              </span>
            ) : (
              "SUBMIT ASSET FOR AI VALUATION"
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block font-mono text-[10px] tracking-[0.2em] text-mist mb-2 uppercase">
        {label}
        {error && <span className="ml-2 text-red-400 normal-case tracking-normal font-body">{error}</span>}
      </label>
      {children}
    </div>
  );
}
