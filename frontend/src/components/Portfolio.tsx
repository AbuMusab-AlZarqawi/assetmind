"use client";

import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { useAssets } from "@/hooks/useAssets";
import { useSellerListings, useBuyerOffers, useCancelListing, useCancelOffer, useWithdrawShares, usePendingWithdrawals } from "@/hooks/useMarketplace";
import { useReadContract } from "wagmi";
import { ASSETMIND_ABI, CONTRACT_ADDRESS } from "@/lib/contract";

function formatRitual(wei: bigint) {
  return parseFloat(formatEther(wei)).toFixed(4);
}

const CATEGORY_LABELS = ["Property", "Land", "Art", "Vehicle", "Other"];

export function Portfolio() {
  const { address, isConnected } = useAccount();
  const { assets } = useAssets();
  const { listings, refetch: refetchListings } = useSellerListings(address);
  const { offers,   refetch: refetchOffers   } = useBuyerOffers(address);
  const { cancelListing } = useCancelListing();
  const { cancelOffer   } = useCancelOffer();

  if (!isConnected) {
    return (
      <div className="py-24 text-center">
        <div className="text-gold/20 text-5xl mb-4">◈</div>
        <p className="font-display text-xl text-mist font-light">Connect your wallet to view your portfolio.</p>
      </div>
    );
  }

  const myAssets      = assets.filter(a => a.owner.toLowerCase() === address?.toLowerCase());
  const activeListings = (listings as any[]).filter((l) => l.active);
  const activeOffers   = (offers   as any[]).filter((o) => o.active);

  return (
    <div className="space-y-10">

      {/* My Tokenized Assets */}
      <section>
        <SectionHeader label="MY TOKENIZED ASSETS" count={myAssets.length} />
        {myAssets.length === 0 ? (
          <Empty msg="You haven't tokenized any assets yet. Go to Tokenize Asset to get started." />
        ) : (
          <div className="space-y-3">
            {myAssets.map((asset, i) => (
              <motion.div
                key={asset.id.toString()}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="card-vault p-5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 border border-gold/30 flex items-center justify-center font-mono text-xs text-gold">
                    #{asset.id.toString().padStart(3, "0")}
                  </div>
                  <div>
                    <div className="font-display text-base text-platinum">{asset.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[9px] text-border uppercase tracking-widest">
                        {CATEGORY_LABELS[Number(asset.category)]}
                      </span>
                      <span className="text-border">·</span>
                      <span className="font-mono text-[9px] text-mist">{asset.location}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-8 text-right">
                  <div>
                    <div className="font-mono text-[9px] text-border uppercase tracking-widest">AI VALUE</div>
                    <div className="font-display text-base text-gold">
                      ${(Number(asset.aiValuation) / 100).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[9px] text-border uppercase tracking-widest">YOUR SHARES</div>
                    <div className="font-mono text-sm text-platinum">
                      <ShareBalance assetId={asset.id} holder={address!} />
                    </div>
                  </div>
                  <PendingWithdrawal assetId={asset.id} recipient={address!} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* My Active Listings */}
      <section>
        <SectionHeader label="MY ACTIVE LISTINGS" count={activeListings.length} />
        {activeListings.length === 0 ? (
          <Empty msg="You have no active share listings. Open any asset and click List Shares." />
        ) : (
          <div className="space-y-3">
            {activeListings.map((l: any, i: number) => {
              const assetName  = assets.find(a => a.id === l.assetId)?.name || `Asset #${l.assetId}`;
              const shareAmt   = BigInt(l.shareAmount);
              const pricePerSh = BigInt(l.pricePerShare);
              const total      = shareAmt * pricePerSh;
              return (
                <motion.div
                  key={String(l.listingId)}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="card-vault p-5 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-display text-base text-platinum">{assetName}</div>
                    <div className="font-mono text-[9px] text-mist mt-0.5">
                      {Number(shareAmt).toLocaleString()} shares @ {formatRitual(pricePerSh)} RITUAL each
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="font-mono text-[9px] text-border uppercase tracking-widest">TOTAL VALUE</div>
                      <div className="font-mono text-sm text-gold">{formatRitual(total)} RITUAL</div>
                    </div>
                    <button
                      onClick={async () => { await cancelListing(BigInt(l.listingId)); refetchListings(); }}
                      className="px-4 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all font-mono text-[9px] tracking-widest uppercase"
                    >
                      CANCEL
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* My Active Offers */}
      <section>
        <SectionHeader label="MY ACTIVE OFFERS" count={activeOffers.length} />
        {activeOffers.length === 0 ? (
          <Empty msg="You have no active offers. Open any asset and click Make Offer." />
        ) : (
          <div className="space-y-3">
            {activeOffers.map((o: any, i: number) => {
              const assetName  = assets.find(a => a.id === o.assetId)?.name || `Asset #${o.assetId}`;
              const shareAmt   = BigInt(o.shareAmount);
              const pricePerSh = BigInt(o.pricePerShare);
              const total      = shareAmt * pricePerSh;
              const daysLeft   = Math.max(0, Math.floor((Number(o.expiresAt) * 1000 - Date.now()) / 86400000));
              return (
                <motion.div
                  key={String(o.offerId)}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="card-vault p-5 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-display text-base text-platinum">{assetName}</div>
                    <div className="font-mono text-[9px] text-mist mt-0.5">
                      {Number(shareAmt).toLocaleString()} shares @ {formatRitual(pricePerSh)} RITUAL each · Expires in {daysLeft}d
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="font-mono text-[9px] text-border uppercase tracking-widest">ESCROWED</div>
                      <div className="font-mono text-sm text-gold">{formatRitual(total)} RITUAL</div>
                    </div>
                    <button
                      onClick={async () => { await cancelOffer(BigInt(o.offerId)); refetchOffers(); }}
                      className="px-4 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all font-mono text-[9px] tracking-widest uppercase"
                    >
                      CANCEL & RECLAIM
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}

function ShareBalance({ assetId, holder }: { assetId: bigint; holder: `0x${string}` }) {
  const { data } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ASSETMIND_ABI,
    functionName: "getShareBalance",
    args: [assetId, holder],
  });
  const balance = (data as bigint | undefined) ?? 0n;
  return <>{Number(balance).toLocaleString()}</>;
}

function PendingWithdrawal({ assetId, recipient }: { assetId: bigint; recipient: `0x${string}` }) {
  const pending = usePendingWithdrawals(assetId, recipient);
  const { withdrawShares, isPending } = useWithdrawShares();
  if (pending === 0n) return null;
  return (
    <div className="text-right">
      <div className="font-mono text-[9px] text-gold uppercase tracking-widest">PENDING SHARES</div>
      <div className="font-mono text-xs text-gold">{Number(pending).toLocaleString()}</div>
      <button
        onClick={async () => { await withdrawShares(assetId); }}
        disabled={isPending}
        className="btn-gold px-3 py-1 text-[9px] font-mono tracking-widest mt-1"
      >
        {isPending ? "…" : "CLAIM"}
      </button>
    </div>
  );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-4 mb-4">
      <div className="h-px flex-1 bg-gradient-to-r from-gold/20 to-transparent" />
      <span className="font-mono text-[10px] tracking-[0.25em] text-gold uppercase">{label}</span>
      <span className="font-mono text-[10px] text-border">({count})</span>
      <div className="h-px flex-1 bg-gradient-to-l from-gold/20 to-transparent" />
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="py-8 text-center border border-border/40">
      <p className="text-mist text-sm font-body">{msg}</p>
    </div>
  );
}
