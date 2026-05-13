require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("═══════════════════════════════════════════════════");
  console.log("  AssetMind — Deploying to Ritual Chain Testnet");
  console.log("═══════════════════════════════════════════════════");
  console.log("  Deployer:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("  Balance: ", hre.ethers.formatEther(balance), "RITUAL");
  console.log("───────────────────────────────────────────────────");

  console.log("  Deploying AssetMind...");
  const AssetMind = await hre.ethers.getContractFactory("AssetMind");
  const assetMind = await AssetMind.deploy();
  await assetMind.waitForDeployment();

  const address = await assetMind.getAddress();

  console.log("───────────────────────────────────────────────────");
  console.log("  ✅ AssetMind deployed!");
  console.log("  Address:", address);
  console.log("───────────────────────────────────────────────────");
  console.log();
  console.log("  📋 Copy these into your frontend/.env.local:");
  console.log();
  console.log("  NEXT_PUBLIC_CONTRACT_ADDRESS=" + address);
  console.log("  NEXT_PUBLIC_CHAIN_ID=1979");
  console.log();
  console.log("  🔍 View on explorer:");
  console.log("  https://explorer.ritualfoundation.org/address/" + address);
  console.log("═══════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});