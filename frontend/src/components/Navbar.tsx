"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion } from "framer-motion";
import { useTotalAssets } from "@/hooks/useAssets";

export function Navbar() {
  const total = useTotalAssets();

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y:  0  }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-gold-subtle bg-obsidian/90 backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative w-7 h-7">
            <div className="absolute inset-0 border border-gold opacity-60" style={{ transform: "rotate(45deg)" }} />
            <div className="absolute inset-1 border border-gold opacity-40" style={{ transform: "rotate(22.5deg)" }} />
            <div className="absolute inset-[6px] bg-gold rounded-none" />
          </div>
          <span className="font-display text-xl font-light tracking-widest text-platinum">
            ASSET<span className="text-gold font-semibold">MIND</span>
          </span>
        </div>

        {/* Centre stats */}
        <div className="hidden md:flex items-center gap-8">
          <Stat label="TOKENIZED ASSETS" value={total.toString()} />
          <div className="h-4 w-px bg-border" />
          <div className="tee-badge">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse-gold inline-block" />
            RITUAL CHAIN · TEE ATTESTED
          </div>
        </div>

        {/* Connect */}
        <ConnectButton
          chainStatus="icon"
          accountStatus="avatar"
          showBalance={false}
        />
      </div>
    </motion.header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="font-mono text-xs text-mist tracking-widest">{label}</div>
      <div className="font-display text-lg text-gold-shimmer">{value}</div>
    </div>
  );
}
