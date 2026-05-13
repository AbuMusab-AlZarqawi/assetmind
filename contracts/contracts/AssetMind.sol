// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PrecompileConsumer} from "./utils/PrecompileConsumer.sol";

/**
 * @title AssetMind
 * @notice Real World Asset tokenization with onchain AI valuation via Ritual Chain's
 *         native LLM precompile (0x0802 — GLM-4.7-FP8 inside a TEE).
 *
 * Flow:
 *  1. User calls submitAsset() → asset stored, AI prompt fired synchronously to 0x0802
 *  2. LLM precompile returns valuation JSON in the same transaction (synchronous path)
 *  3. Contract parses the AI response, stores valuation + risk score onchain
 *  4. Fractional ERC-20 shares are minted to the submitter
 *
 * @dev Deployed on Ritual Chain Testnet (Chain ID: 1979)
 */
contract AssetMind is PrecompileConsumer {
    // ─────────────────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────────────────

    enum AssetCategory { Property, Land, Art, Vehicle, Other }

    struct Asset {
        uint256 id;
        address owner;
        string  name;
        string  description;
        string  location;
        AssetCategory category;
        uint256 estimatedValue;   // in USD cents (no decimals)
        uint256 aiValuation;      // in USD cents — set by AI
        uint8   riskScore;        // 1-100, set by AI
        string  aiReport;         // full AI-generated report text
        bool    valuationComplete;
        uint256 sharesSupply;     // total fractional ERC-20 shares minted
        uint256 submittedAt;
    }

    struct ShareBalance {
        uint256 assetId;
        uint256 balance;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    uint256 public nextAssetId;
    uint256 public constant SHARES_PER_ASSET = 1_000_000; // 1M fractional shares

    mapping(uint256 => Asset) public assets;
    // assetId => holder => share balance
    mapping(uint256 => mapping(address => uint256)) public shareBalances;
    // assetId => list of holders
    mapping(uint256 => address[]) private _holders;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event AssetSubmitted(
        uint256 indexed assetId,
        address indexed owner,
        string  name,
        AssetCategory category,
        uint256 estimatedValue
    );

    event ValuationComplete(
        uint256 indexed assetId,
        uint256 aiValuation,
        uint8   riskScore,
        string  aiReport
    );

    event SharesTransferred(
        uint256 indexed assetId,
        address indexed from,
        address indexed to,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Core: Submit + Valuate
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Submit a real world asset for tokenization.
     *         Fires the Ritual Chain LLM precompile synchronously for AI valuation.
     * @param name            Human-readable name of the asset.
     * @param description     Detailed description.
     * @param location        Physical location (city/country).
     * @param category        Asset category enum.
     * @param estimatedValue  Owner's estimated value in USD cents.
     */
    function submitAsset(
        string  calldata name,
        string  calldata description,
        string  calldata location,
        AssetCategory category,
        uint256 estimatedValue
    ) external returns (uint256 assetId) {
        require(bytes(name).length > 0,        "AssetMind: name required");
        require(bytes(description).length > 0, "AssetMind: description required");
        require(bytes(location).length > 0,    "AssetMind: location required");
        require(estimatedValue > 0,            "AssetMind: estimatedValue must be > 0");

        assetId = nextAssetId++;

        assets[assetId] = Asset({
            id:                assetId,
            owner:             msg.sender,
            name:              name,
            description:       description,
            location:          location,
            category:          category,
            estimatedValue:    estimatedValue,
            aiValuation:       0,
            riskScore:         0,
            aiReport:          "",
            valuationComplete: false,
            sharesSupply:      0,
            submittedAt:       block.timestamp
        });

        emit AssetSubmitted(assetId, msg.sender, name, category, estimatedValue);

        // ── Call Ritual Chain LLM precompile at 0x0802 ──────────────────────
        _requestAIValuation(assetId);

        return assetId;
    }

    /**
     * @dev Build an LLM prompt and call the Ritual Chain precompile synchronously.
     *      The precompile runs GLM-4.7-FP8 in a TEE — TEE attestation is implicit.
     */
    function _requestAIValuation(uint256 assetId) internal {
        Asset storage asset = assets[assetId];

        string memory categoryName = _categoryToString(asset.category);
        uint256 valueUsd = asset.estimatedValue / 100;

        // Construct the prompt
        string memory prompt = string(abi.encodePacked(
            "You are an expert real world asset (RWA) valuation analyst. "
            "Analyse the following asset and return ONLY a JSON object with no extra text:\n\n"
            "Asset Name: ", asset.name, "\n"
            "Category: ", categoryName, "\n"
            "Location: ", asset.location, "\n"
            "Description: ", asset.description, "\n"
            "Owner Estimated Value (USD): $", _uint2str(valueUsd), "\n\n"
            "Return JSON in this exact format:\n"
            "{\n"
            "  \"aiValuationUsd\": <integer USD value>,\n"
            "  \"riskScore\": <integer 1-100 where 1=lowest risk 100=highest risk>,\n"
            "  \"report\": \"<2-3 sentence professional valuation summary>\"\n"
            "}"
        ));

        // Encode for the LLM precompile: (string prompt)
        bytes memory llmInput = abi.encode(prompt);

        // Call 0x0802 — synchronous: result returned in same call frame
        bytes memory llmOutput = _executePrecompile(LLM_INFERENCE_PRECOMPILE, llmInput);

        // Decode response: precompile returns (string completion)
        string memory completion = abi.decode(llmOutput, (string));

        // Parse the JSON response
        _parseAndStoreValuation(assetId, completion);

        // Mint fractional shares to the submitter
        _mintShares(assetId, asset.owner);
    }

    /**
     * @dev Parse the AI JSON response and store valuation data.
     *      Uses a lightweight substring extraction approach suitable for
     *      deterministic onchain execution.
     */
    function _parseAndStoreValuation(uint256 assetId, string memory json) internal {
        Asset storage asset = assets[assetId];

        // Extract aiValuationUsd
        uint256 aiVal = _extractUint(json, '"aiValuationUsd":');
        // Extract riskScore
        uint256 risk  = _extractUint(json, '"riskScore":');
        // Extract report string
        string memory report = _extractString(json, '"report":');

        // Clamp risk score to 1-100
        if (risk == 0) risk = 50;
        if (risk > 100) risk = 100;

        // Default fallback if parsing fails
        if (aiVal == 0) aiVal = asset.estimatedValue / 100;

        asset.aiValuation      = aiVal * 100; // store as cents
        asset.riskScore        = uint8(risk);
        asset.aiReport         = bytes(report).length > 0 ? report : "AI valuation completed on Ritual Chain.";
        asset.valuationComplete = true;

        emit ValuationComplete(assetId, asset.aiValuation, asset.riskScore, asset.aiReport);
    }

    function _mintShares(uint256 assetId, address to) internal {
        Asset storage asset = assets[assetId];
        asset.sharesSupply = SHARES_PER_ASSET;
        shareBalances[assetId][to] = SHARES_PER_ASSET;
        _holders[assetId].push(to);

        emit SharesTransferred(assetId, address(0), to, SHARES_PER_ASSET);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Share Transfers
    // ─────────────────────────────────────────────────────────────────────────

    function transferShares(uint256 assetId, address to, uint256 amount) external {
        require(to != address(0),                               "AssetMind: zero address");
        require(shareBalances[assetId][msg.sender] >= amount,  "AssetMind: insufficient shares");
        shareBalances[assetId][msg.sender] -= amount;
        shareBalances[assetId][to]         += amount;
        emit SharesTransferred(assetId, msg.sender, to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // View Functions
    // ─────────────────────────────────────────────────────────────────────────

    function getAsset(uint256 assetId) external view returns (Asset memory) {
        require(assetId < nextAssetId, "AssetMind: asset does not exist");
        return assets[assetId];
    }

    function getAllAssets() external view returns (Asset[] memory) {
        Asset[] memory all = new Asset[](nextAssetId);
        for (uint256 i = 0; i < nextAssetId; i++) {
            all[i] = assets[i];
        }
        return all;
    }

    function getShareBalance(uint256 assetId, address holder) external view returns (uint256) {
        return shareBalances[assetId][holder];
    }

    function totalAssets() external view returns (uint256) {
        return nextAssetId;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal Helpers
    // ─────────────────────────────────────────────────────────────────────────

    function _categoryToString(AssetCategory cat) internal pure returns (string memory) {
        if (cat == AssetCategory.Property) return "Property";
        if (cat == AssetCategory.Land)     return "Land";
        if (cat == AssetCategory.Art)      return "Art";
        if (cat == AssetCategory.Vehicle)  return "Vehicle";
        return "Other";
    }

    function _uint2str(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 tmp = v;
        uint256 digits;
        while (tmp != 0) { digits++; tmp /= 10; }
        bytes memory buf = new bytes(digits);
        while (v != 0) { digits--; buf[digits] = bytes1(uint8(48 + v % 10)); v /= 10; }
        return string(buf);
    }

    /**
     * @dev Extract the first uint value that follows `key` in `json`.
     */
    function _extractUint(string memory json, string memory key) internal pure returns (uint256) {
        bytes memory j = bytes(json);
        bytes memory k = bytes(key);
        int256 pos = _indexOf(j, k);
        if (pos < 0) return 0;
        uint256 start = uint256(pos) + k.length;
        // skip whitespace
        while (start < j.length && (j[start] == 0x20 || j[start] == 0x09)) start++;
        uint256 result;
        bool found;
        while (start < j.length && j[start] >= 0x30 && j[start] <= 0x39) {
            result = result * 10 + (uint8(j[start]) - 48);
            start++;
            found = true;
        }
        return found ? result : 0;
    }

    /**
     * @dev Extract the first string value that follows `key` in `json`.
     */
    function _extractString(string memory json, string memory key) internal pure returns (string memory) {
        bytes memory j = bytes(json);
        bytes memory k = bytes(key);
        int256 pos = _indexOf(j, k);
        if (pos < 0) return "";
        uint256 start = uint256(pos) + k.length;
        while (start < j.length && j[start] != 0x22) start++; // find opening "
        if (start >= j.length) return "";
        start++; // skip opening "
        uint256 end = start;
        while (end < j.length && j[end] != 0x22) end++;
        bytes memory result = new bytes(end - start);
        for (uint256 i = 0; i < end - start; i++) result[i] = j[start + i];
        return string(result);
    }

    function _indexOf(bytes memory haystack, bytes memory needle) internal pure returns (int256) {
        if (needle.length > haystack.length) return -1;
        for (uint256 i = 0; i <= haystack.length - needle.length; i++) {
            bool isMatch = true;
            for (uint256 j = 0; j < needle.length; j++) {
                if (haystack[i + j] != needle[j]) { isMatch = false; break; }
            }
            if (isMatch) return int256(i);
        }
        return -1;
    }
}
