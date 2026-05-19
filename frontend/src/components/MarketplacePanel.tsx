"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { formatEther, parseEther } from "viem";
import {
  useAssetListings, useAssetOffers,
  useListShares, useBuyShares, useMakeOffer,
  useAcceptOffer, useCancelOffer, useCancelListing,
} from "@/hooks/useMarketplace";
import type { Asset } from "@/types";

const FEE = 2.5;

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatRitual(wei: bigint) {
  return parseFloat(formatEther(wei)).toFixed(4);
}

interface Props { asset: Asset; onClose: () => void; }
type Panel = "listings" | "offers" | "sell" | "offer";

export function MarketplacePanel({ asset, onClose }: Props) {
  const { address } = useAccount();
  const [panel, setPanel] = useState<Panel>("listings");
  const { listings, refetch: refetchListings } = useAssetListings(asset.id);
  const { offers,   refetch: refetchOffers   } = useAssetOffers(asset.id);
  const activeListings = (listings as any[]).filter((l) => l.active);
  const activeOffers   = (offers   as any[]).filter((o) => o.active);
  const refresh = () => { refetchListings(); refetchOffers(); };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        exit={{   opacity: 0, y: 32, scale: 0.97 }}
        transition={{ duration: 0.3 }}
        className="card-vault w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div>
            <div className="tee-badge mb-2">◈ MARKETPLACE</div>
            <h2 className="font-display text-2xl font-light text-platinum tracking-wide">{asset.name}</h2>
            <p className="text-mist text-xs mt-1 font-body">{asset.location}</p>
          </div>
          <button onClick={onClose} className="text-mist hover:text-platinum transition-colors text-xl ml-4 mt-1">✕</button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 border-b border-border">
          <Stat label="AI VALUATION" value={`$${(Number(asset.aiValuation) / 100).toLocaleString()}`} gold />
          <Stat label="TOTAL SHARES"  value={(1_000_000).toLocaleString()} />
          <Stat label="RISK SCORE"    value={`${asset.riskScore}/100`} />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {([
            { key: "listings", label: `LISTINGS (${activeListings.length})` },
            { key: "offers",   label: `OFFERS (${activeOffers.length})`     },
            { key: "sell",     label: "LIST SHARES"                          },
            { key: "offer",    label: "MAKE OFFER"                           },
          ] as { key: Panel; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setPanel(t.key)}
              className={`flex-1 py-3 font-mono text-[10px] tracking-[0.15em] uppercase transition-all ${
                panel === t.key ? "text-gold border-b-2 border-gold bg-gold/5" : "text-mist hover:text-platinum"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Panel content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={panel}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{   opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
            >
              {panel === "listings" && <ListingsPanel listings={activeListings} address={address} onRefresh={refresh} />}
              {panel === "offers"   && <OffersPanel   offers={activeOffers}     address={address} onRefresh={refresh} />}
              {panel === "sell"     && <SellPanel   assetId={asset.id} onRefresh={refresh} />}
              {panel === "offer"    && <OfferPanel  assetId={asset.id} onRefresh={refresh} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Listings ─────────────────────────────────────────────────────────────────

function ListingsPanel({ listings, address, onRefresh }: { listings: any[]; address?: string; onRefresh: () => void }) {
  const { buyShares, isPending, isConfirming } = useBuyShares();
  const { cancelListing } = useCancelListing();
  const [buying, setBuying] = useState<bigint | null>(null);
  const [buyAmt, setBuyAmt] = useState("");

  if (listings.length === 0) return <Empty msg="No active listings for this asset." />;

  const handleBuy = async (listing: any) => {
    if (!buyAmt || parseFloat(buyAmt) <= 0) return;
    const amt   = BigInt(Math.floor(parseFloat(buyAmt)));
    const price = BigInt(listing.pricePerShare);
    const total = amt * price;
    try {
      await buyShares(BigInt(listing.listingId), amt, total);
      setBuying(null);
      setBuyAmt("");
      onRefresh();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-3">
      {listings.map((l: any) => {
        const shareAmt   = BigInt(l.shareAmount);
        const pricePerSh = BigInt(l.pricePerShare);
        const total      = shareAmt * pricePerSh;

        return (
          <div key={String(l.listingId)} className="border border-border p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-mono text-[10px] text-mist tracking-widest">SELLER</div>
                <div className="font-mono text-xs text-platinum">{shortenAddress(l.seller)}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] text-mist tracking-widest">SHARES AVAILABLE</div>
                <div className="font-display text-lg text-gold">{Number(shareAmt).toLocaleString()}</div>
              </div>
            </div>
            <div className="divider-gold" />
            <div className="flex justify-between items-center">
              <div>
                <div className="font-mono text-[10px] text-mist">PRICE PER SHARE</div>
                <div className="font-mono text-sm text-platinum">{formatRitual(pricePerSh)} RITUAL</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] text-mist">TOTAL (ALL SHARES)</div>
                <div className="font-mono text-sm text-gold">{formatRitual(total)} RITUAL</div>
              </div>
            </div>
            <div className="font-mono text-[9px] text-border">{FEE}% protocol fee applied on purchase</div>

            {address?.toLowerCase() === l.seller.toLowerCase() ? (
              <button
                onClick={async () => { await cancelListing(BigInt(l.listingId)); onRefresh(); }}
                className="w-full py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all font-mono text-[10px] tracking-widest uppercase"
              >
                CANCEL LISTING
              </button>
            ) : buying === BigInt(l.listingId) ? (
              <div className="space-y-2">
                <input
                  type="number"
                  value={buyAmt}
                  onChange={e => setBuyAmt(e.target.value)}
                  placeholder={`Max ${Number(shareAmt).toLocaleString()} shares`}
                  className="input-vault w-full px-3 py-2 text-sm font-mono"
                />
                {buyAmt && parseFloat(buyAmt) > 0 && (
                  <div className="font-mono text-[10px] text-mist">
                    Total: {formatRitual(BigInt(Math.floor(parseFloat(buyAmt))) * pricePerSh)} RITUAL (+{FEE}% fee)
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBuy(l)}
                    disabled={isPending || isConfirming}
                    className="flex-1 btn-gold py-2 font-mono text-[10px] tracking-widest"
                  >
                    {isPending || isConfirming ? "PROCESSING…" : "CONFIRM BUY"}
                  </button>
                  <button
                    onClick={() => { setBuying(null); setBuyAmt(""); }}
                    className="px-4 border border-border text-mist hover:text-platinum transition-colors font-mono text-[10px]"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setBuying(BigInt(l.listingId)); setBuyAmt(""); }}
                className="btn-gold w-full py-2 font-mono text-[10px] tracking-widest"
              >
                BUY SHARES
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Offers ────────────────────────────────────────────────────────────────────

function OffersPanel({ offers, address, onRefresh }: { offers: any[]; address?: string; onRefresh: () => void }) {
  const { acceptOffer, isPending: accepting } = useAcceptOffer();
  const { cancelOffer, isPending: cancelling } = useCancelOffer();

  if (offers.length === 0) return <Empty msg="No active offers on this asset." />;

  return (
    <div className="space-y-3">
      {offers.map((o: any) => {
        const shareAmt   = BigInt(o.shareAmount);
        const pricePerSh = BigInt(o.pricePerShare);
        const total      = shareAmt * pricePerSh;
        const isMyOffer  = address?.toLowerCase() === o.buyer.toLowerCase();
        const daysLeft   = Math.max(0, Math.floor((Number(o.expiresAt) * 1000 - Date.now()) / 86400000));

        return (
          <div key={String(o.offerId)} className="border border-border p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-mono text-[10px] text-mist tracking-widest">BUYER</div>
                <div className="font-mono text-xs text-platinum">{shortenAddress(o.buyer)}</div>
              </div>
              <div className="font-mono text-[9px] text-border">Expires in {daysLeft}d</div>
            </div>
            <div className="divider-gold" />
            <div className="flex justify-between items-center">
              <div>
                <div className="font-mono text-[10px] text-mist">OFFERING FOR</div>
                <div className="font-display text-lg text-gold">{Number(shareAmt).toLocaleString()} shares</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] text-mist">TOTAL OFFER</div>
                <div className="font-mono text-sm text-platinum">{formatRitual(total)} RITUAL</div>
                <div className="font-mono text-[9px] text-mist">{formatRitual(pricePerSh)}/share</div>
              </div>
            </div>

            {isMyOffer ? (
              <button
                onClick={async () => { await cancelOffer(BigInt(o.offerId)); onRefresh(); }}
                disabled={cancelling}
                className="w-full py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all font-mono text-[10px] tracking-widest uppercase"
              >
                {cancelling ? "CANCELLING…" : "CANCEL OFFER & RECLAIM RITUAL"}
              </button>
            ) : (
              <button
                onClick={async () => { await acceptOffer(BigInt(o.offerId)); onRefresh(); }}
                disabled={accepting}
                className="btn-gold w-full py-2 font-mono text-[10px] tracking-widest"
              >
                {accepting ? "PROCESSING…" : `ACCEPT — RECEIVE ${formatRitual(total * 975n / 1000n)} RITUAL`}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Sell ──────────────────────────────────────────────────────────────────────

function SellPanel({ assetId, onRefresh }: { assetId: bigint; onRefresh: () => void }) {
  const [shares, setShares] = useState("");
  const [price,  setPrice]  = useState("");
  const { listShares, isPending, isConfirming, isSuccess, error } = useListShares();

  const handleList = async () => {
    if (!shares || !price) return;
    try {
      await listShares(assetId, BigInt(Math.floor(parseFloat(shares))), parseEther(price));
      onRefresh();
    } catch (e) { console.error(e); }
  };

  if (isSuccess) return (
    <div className="text-center py-8">
      <div className="text-gold text-3xl mb-3">✓</div>
      <p className="font-display text-xl text-platinum">Shares Listed!</p>
      <p className="text-mist text-sm mt-2 font-body">Your shares are now visible in the Listings tab.</p>
    </div>
  );

  const total = shares && price && parseFloat(shares) > 0 && parseFloat(price) > 0
    ? parseFloat(shares) * parseFloat(price) : 0;

  return (
    <div className="space-y-5">
      <div className="border border-gold/10 bg-gold/5 p-4 text-xs text-mist font-body leading-relaxed">
        <span className="text-gold font-mono">Note:</span> Transfer your shares to the marketplace contract address first via AssetMind, then list them here.
      </div>
      <Field label="NUMBER OF SHARES TO LIST">
        <input type="number" value={shares} onChange={e => setShares(e.target.value)}
          placeholder="e.g. 100000" className="input-vault w-full px-4 py-3 font-mono text-sm" />
      </Field>
      <Field label="PRICE PER SHARE (RITUAL)">
        <input type="number" value={price} onChange={e => setPrice(e.target.value)}
          placeholder="e.g. 0.001" step="0.0001" className="input-vault w-full px-4 py-3 font-mono text-sm" />
      </Field>
      {total > 0 && (
        <div className="border border-border p-4 space-y-2">
          <Row label="Total listing value" value={`${total.toFixed(4)} RITUAL`} />
          <Row label="Protocol fee (2.5%)"  value={`${(total * 0.025).toFixed(4)} RITUAL`} dim />
          <div className="divider-gold" />
          <Row label="You receive" value={`${(total * 0.975).toFixed(4)} RITUAL`} gold />
        </div>
      )}
      {error && <div className="text-red-400 text-xs font-mono border border-red-500/20 p-3">{(error as Error).message?.slice(0, 150)}</div>}
      <button onClick={handleList} disabled={isPending || isConfirming || !shares || !price}
        className="btn-gold w-full py-4 font-mono text-[10px] tracking-widest">
        {isPending || isConfirming ? "PROCESSING…" : "LIST SHARES FOR SALE"}
      </button>
    </div>
  );
}

// ── Offer ─────────────────────────────────────────────────────────────────────

function OfferPanel({ assetId, onRefresh }: { assetId: bigint; onRefresh: () => void }) {
  const [shares, setShares] = useState("");
  const [price,  setPrice]  = useState("");
  const { makeOffer, isPending, isConfirming, isSuccess, error } = useMakeOffer();

  const handleOffer = async () => {
    if (!shares || !price) return;
    const shareAmt      = BigInt(Math.floor(parseFloat(shares)));
    const pricePerShare = parseEther(price);
    const total         = shareAmt * pricePerShare;
    try {
      await makeOffer(assetId, shareAmt, pricePerShare, total);
      onRefresh();
    } catch (e) { console.error(e); }
  };

  if (isSuccess) return (
    <div className="text-center py-8">
      <div className="text-gold text-3xl mb-3">✓</div>
      <p className="font-display text-xl text-platinum">Offer Made!</p>
      <p className="text-mist text-sm mt-2 font-body">RITUAL escrowed. Expires in 7 days.</p>
    </div>
  );

  const total = shares && price && parseFloat(shares) > 0 && parseFloat(price) > 0
    ? parseFloat(shares) * parseFloat(price) : 0;

  return (
    <div className="space-y-5">
      <div className="border border-gold/10 bg-gold/5 p-4 text-xs text-mist font-body leading-relaxed">
        <span className="text-gold font-mono">How it works:</span> Your RITUAL is held in escrow onchain.
        The asset owner can accept within 7 days. If not, cancel to reclaim.
      </div>
      <Field label="SHARES YOU WANT TO BUY">
        <input type="number" value={shares} onChange={e => setShares(e.target.value)}
          placeholder="e.g. 50000" className="input-vault w-full px-4 py-3 font-mono text-sm" />
      </Field>
      <Field label="YOUR PRICE PER SHARE (RITUAL)">
        <input type="number" value={price} onChange={e => setPrice(e.target.value)}
          placeholder="e.g. 0.0008" step="0.0001" className="input-vault w-full px-4 py-3 font-mono text-sm" />
      </Field>
      {total > 0 && (
        <div className="border border-border p-4 space-y-2">
          <Row label="RITUAL to escrow" value={`${total.toFixed(4)} RITUAL`} gold />
          <Row label="Expires"          value="7 days from now" />
        </div>
      )}
      {error && <div className="text-red-400 text-xs font-mono border border-red-500/20 p-3">{(error as Error).message?.slice(0, 150)}</div>}
      <button onClick={handleOffer} disabled={isPending || isConfirming || !shares || !price}
        className="btn-gold w-full py-4 font-mono text-[10px] tracking-widest">
        {isPending || isConfirming ? "PROCESSING…" : "SUBMIT OFFER (ESCROW RITUAL)"}
      </button>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Stat({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="p-4 text-center border-r border-border last:border-r-0">
      <div className="font-mono text-[9px] tracking-widest text-border uppercase mb-1">{label}</div>
      <div className={`font-display text-base ${gold ? "text-gold-shimmer" : "text-platinum"}`}>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block font-mono text-[10px] tracking-[0.2em] text-mist mb-2 uppercase">{label}</label>
      {children}
    </div>
  );
}

function Row({ label, value, gold, dim }: { label: string; value: string; gold?: boolean; dim?: boolean }) {
  return (
    <div className="flex justify-between font-mono text-xs">
      <span className="text-mist">{label}</span>
      <span className={gold ? "text-gold" : dim ? "text-border" : "text-platinum"}>{value}</span>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="py-12 text-center">
      <div className="text-gold/20 text-4xl mb-3">◈</div>
      <p className="text-mist text-sm font-body">{msg}</p>
    </div>
  );
}