"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAssets } from "@/hooks/useAssets";
import { AssetCard } from "./AssetCard";
import { MarketplacePanel } from "./MarketplacePanel";
import type { AssetCategoryEnum } from "@/types";

const CATEGORY_FILTERS = [
  { label: "ALL",      value: -1  },
  { label: "PROPERTY", value: 0   },
  { label: "LAND",     value: 1   },
  { label: "ART",      value: 2   },
  { label: "VEHICLE",  value: 3   },
  { label: "OTHER",    value: 4   },
];

const SORT_OPTIONS = [
  { label: "NEWEST FIRST",   value: "newest"  },
  { label: "HIGHEST VALUE",  value: "value"   },
  { label: "LOWEST RISK",    value: "risk"    },
];

export function AssetFeed() {
  const { assets, isLoading, error, refetch } = useAssets();
  const [categoryFilter, setCategoryFilter] = useState<number>(-1);
  const [sortBy, setSortBy] = useState("newest");
  const [marketplaceAsset, setMarketplaceAsset] = useState<any>(null);

  const filtered = [...assets]
    .filter(a => categoryFilter === -1 || Number(a.category) === categoryFilter)
    .sort((a, b) => {
      if (sortBy === "newest")  return Number(b.submittedAt) - Number(a.submittedAt);
      if (sortBy === "value")   return Number(b.aiValuation || b.estimatedValue) - Number(a.aiValuation || a.estimatedValue);
      if (sortBy === "risk")    return (a.riskScore || 100) - (b.riskScore || 100);
      return 0;
    });

  return (
    <section>
      {/* Section header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-px w-8 bg-gold opacity-40" />
            <span className="font-mono text-[10px] tracking-[0.25em] text-gold uppercase">
              Registry
            </span>
          </div>
          <h2 className="font-display text-3xl font-light text-platinum tracking-wide">
            Tokenized Assets
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="border border-border text-mist hover:border-gold hover:text-gold transition-all px-3 py-1.5 font-mono text-[10px] tracking-widest uppercase"
          >
            ↻ REFRESH
          </button>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-vault border border-border text-mist text-[10px] font-mono tracking-widest px-3 py-1.5 uppercase focus:outline-none focus:border-gold/50"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORY_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setCategoryFilter(f.value)}
            className={`px-4 py-1.5 font-mono text-[10px] tracking-[0.2em] uppercase transition-all duration-200 ${
              categoryFilter === f.value
                ? "bg-gold text-obsidian"
                : "border border-border text-mist hover:border-gold/40 hover:text-platinum"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* States */}
      {isLoading && (
        <div className="py-24 text-center">
          <div className="inline-flex flex-col items-center gap-4">
            <div className="w-10 h-10 border border-gold/30 relative">
              <div className="absolute inset-0 border-t border-gold animate-spin" />
              <div className="absolute inset-2 bg-gold/10" />
            </div>
            <span className="font-mono text-xs text-mist tracking-widest uppercase">
              Loading registry…
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="py-12 text-center border border-red-500/20 bg-red-500/5">
          <p className="text-red-400 font-mono text-xs">
            Failed to load assets. Check your contract address and RPC.
          </p>
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-24 text-center"
        >
          <div className="w-16 h-16 mx-auto mb-6 border border-gold/20 relative flex items-center justify-center"
               style={{ transform: "rotate(45deg)" }}>
            <span className="text-gold/40 text-2xl" style={{ transform: "rotate(-45deg)" }}>◈</span>
          </div>
          <p className="font-display text-xl text-mist font-light tracking-wide">
            No assets found
          </p>
          <p className="text-mist/60 text-sm mt-2 font-body">
            {assets.length === 0
              ? "Be the first to tokenize a real world asset."
              : "No assets match this filter."}
          </p>
        </motion.div>
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((asset, i) => (
            <AssetCard key={asset.id.toString()} asset={asset} index={i} onMarketplace={setMarketplaceAsset} />
          ))}
        </div>
      )}
    </section>

      <AnimatePresence>
        {marketplaceAsset && (
          <MarketplacePanel
            asset={marketplaceAsset}
            onClose={() => setMarketplaceAsset(null)}
          />
        )}
      </AnimatePresence>
  );
}
