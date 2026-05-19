require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  // ── Read the AssetMind contract address from .env ──────────────────────
  const assetMindAddress = process.env.ASSETMIND_CONTRACT_ADDRESS;
  if (!assetMindAddress) {
    throw new Error(
      "ASSETMIND_CONTRACT_ADDRESS not set in .env\n" +
      "Add it: ASSETMIND_CONTRACT_ADDRESS=0x3f5F705c12Ec5b7a589605baD7f9670383db8087"
    );
  }

  console.log("═══════════════════════════════════════════════════════");
  console.log("  AssetMind Marketplace — Deploying to Ritual Chain");
  console.log("═══════════════════════════════════════════════════════");
  console.log("  Deployer:    ", deployer.address);
  console.log("  AssetMind:   ", assetMindAddress);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("  Balance:     ", hre.ethers.formatEther(balance), "RITUAL");
  console.log("───────────────────────────────────────────────────────");

  console.log("  Deploying AssetMindMarketplace...");
  const Marketplace = await hre.ethers.getContractFactory("AssetMindMarketplace");
  const marketplace = await Marketplace.deploy(assetMindAddress);
  await marketplace.waitForDeployment();

  const address = await marketplace.getAddress();

  console.log("───────────────────────────────────────────────────────");
  console.log("  ✅ AssetMindMarketplace deployed!");
  console.log("  Address:", address);
  console.log("───────────────────────────────────────────────────────");
  console.log();
  console.log("  📋 Add these to your frontend/.env.local:");
  console.log();
  console.log("  NEXT_PUBLIC_MARKETPLACE_ADDRESS=" + address);
  console.log();
  console.log("  🔍 View on explorer:");
  console.log("  https://explorer.ritualfoundation.org/address/" + address);
  console.log("═══════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
