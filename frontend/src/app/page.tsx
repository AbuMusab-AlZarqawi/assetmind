"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Navbar }          from "@/components/Navbar";
import { Hero }            from "@/components/Hero";
import { SubmitAssetForm } from "@/components/SubmitAssetForm";
import { AssetFeed }       from "@/components/AssetFeed";
import { useAssets }       from "@/hooks/useAssets";

type Tab = "feed" | "submit";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const { refetch } = useAssets();

  const handleSubmitSuccess = () => {
    setActiveTab("feed");
    setTimeout(() => refetch(), 2500); // give chain a moment
  };

  return (
    <div className="min-h-screen bg-obsidian bg-noise">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 pt-28 pb-20">
        {/* Hero */}
        <Hero />

        {/* Divider */}
        <div className="my-14 divider-gold" />

        {/* Tab controls */}
        <div className="flex items-center gap-0 mb-10">
          {(["feed", "submit"] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-3 font-mono text-xs tracking-[0.25em] uppercase transition-all duration-200 relative ${
                activeTab === tab
                  ? "text-obsidian bg-gold"
                  : "text-mist border border-border hover:border-gold/40 hover:text-platinum"
              }`}
            >
              {tab === "feed"   ? "◈ ASSET REGISTRY" : "⊕ TOKENIZE ASSET"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0  }}
          transition={{ duration: 0.35 }}
        >
          {activeTab === "feed" ? (
            <AssetFeed />
          ) : (
            <div className="max-w-2xl">
              <SubmitAssetForm onSuccess={handleSubmitSuccess} />
            </div>
          )}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border border-gold/40" style={{ transform: "rotate(45deg)" }} />
            <span className="font-display text-sm text-mist tracking-widest">
              ASSETMIND
            </span>
          </div>
          <div className="font-mono text-[10px] text-border tracking-widest uppercase text-center">
            Powered by Ritual Chain · LLM Precompile 0x0802 · TEE-Attested AI Valuation
          </div>
          <a
            href="https://explorer.ritualfoundation.org"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] text-mist hover:text-gold transition-colors tracking-widest uppercase"
          >
            RITUAL EXPLORER ↗
          </a>
        </div>
      </footer>
    </div>
  );
}
