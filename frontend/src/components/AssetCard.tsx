"use client";

import { motion } from "framer-motion";
import type { Asset } from "@/types";

const CATEGORY_LABELS = ["Property", "Land", "Art", "Vehicle", "Other"];
const CATEGORY_ICONS  = ["⬡", "◈", "◇", "◻", "○"];

function getRiskClass(score: number) {
  if (score <= 33)  return "risk-badge-low";
  if (score <= 66)  return "risk-badge-mid";
  return "risk-badge-high";
}

function getRiskLabel(score: number) {
  if (score <= 33)  return "LOW RISK";
  if (score <= 66)  return "MODERATE";
  return "HIGH RISK";
}

function formatUsd(cents: bigint) {
  const dollars = Number(cents) / 100;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(dollars);
}

function formatDate(ts: bigint) {
  return new Date(Number(ts) * 1000).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

interface Props {
  asset: Asset;
  index: number;
}

export function AssetCard({ asset, index }: Props) {
  const cat = Number(asset.category);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07 }}
      className="card-vault rounded-none group hover:border-gold/30 transition-all duration-300"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="text-gold text-sm">{CATEGORY_ICONS[cat]}</span>
          <span className="font-mono text-[10px] tracking-[0.2em] text-mist uppercase">
            {CATEGORY_LABELS[cat]}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {asset.valuationComplete ? (
            <span className="tee-badge">
              <span className="w-1 h-1 rounded-full bg-gold inline-block" />
              TEE VERIFIED
            </span>
          ) : (
            <span className="tee-badge opacity-50">PENDING</span>
          )}
          <span className="font-mono text-[10px] text-border">
            #{asset.id.toString().padStart(4, "0")}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Name + location */}
        <div>
          <h3 className="font-display text-xl font-light text-platinum tracking-wide leading-tight group-hover:text-gold transition-colors duration-300">
            {asset.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-mist text-xs">◎</span>
            <span className="text-mist text-xs font-body">{asset.location}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-mist text-xs font-body leading-relaxed line-clamp-2">
          {asset.description}
        </p>

        <div className="divider-gold" />

        {/* Valuations */}
        <div className="grid grid-cols-2 gap-4">
          <ValuationBlock
            label="OWNER ESTIMATE"
            value={formatUsd(asset.estimatedValue)}
            dim
          />
          <ValuationBlock
            label="AI VALUATION"
            value={asset.valuationComplete ? formatUsd(asset.aiValuation) : "—"}
            gold={asset.valuationComplete}
          />
        </div>

        {/* Risk score */}
        {asset.valuationComplete && (
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-[0.15em] text-mist uppercase">Risk Score</span>
            <div className="flex items-center gap-2">
              {/* Bar */}
              <div className="w-24 h-1 bg-border rounded-none overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${asset.riskScore}%` }}
                  transition={{ duration: 0.8, delay: index * 0.07 + 0.3 }}
                  className={`h-full ${
                    asset.riskScore <= 33  ? "bg-risk-low" :
                    asset.riskScore <= 66  ? "bg-risk-mid" :
                                             "bg-risk-high"
                  }`}
                />
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-none ${getRiskClass(asset.riskScore)}`}>
                {getRiskLabel(asset.riskScore)} · {asset.riskScore}
              </span>
            </div>
          </div>
        )}

        {/* AI Report */}
        {asset.valuationComplete && asset.aiReport && (
          <div className="border-l-2 border-gold/30 pl-3">
            <p className="font-mono text-[10px] tracking-[0.15em] text-gold/60 uppercase mb-1">
              AI Report · GLM-4.7-FP8
            </p>
            <p className="text-mist text-xs font-body leading-relaxed line-clamp-3 italic">
              "{asset.aiReport}"
            </p>
          </div>
        )}

        <div className="divider-gold" />

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono text-[10px] text-border uppercase tracking-widest">Owner</span>
            <div className="font-mono text-xs text-mist mt-0.5">
              {shortenAddress(asset.owner)}
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-[10px] text-border uppercase tracking-widest">Shares</span>
            <div className="font-mono text-xs text-mist mt-0.5">
              {asset.sharesSupply.toLocaleString()}
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-[10px] text-border uppercase tracking-widest">Listed</span>
            <div className="font-mono text-xs text-mist mt-0.5">
              {formatDate(asset.submittedAt)}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ValuationBlock({
  label,
  value,
  gold,
  dim,
}: {
  label: string;
  value: string;
  gold?: boolean;
  dim?: boolean;
}) {
  return (
    <div>
      <span className="font-mono text-[10px] tracking-[0.15em] text-border uppercase block mb-1">
        {label}
      </span>
      <span
        className={`font-display text-lg font-light tracking-wide ${
          gold ? "text-gold-shimmer" : dim ? "text-mist" : "text-platinum"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
