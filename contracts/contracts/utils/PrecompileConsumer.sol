// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PrecompileConsumer
 * @notice Base contract for interacting with Ritual Chain native AI precompiles.
 *         Mirrors the official Ritual Chain PrecompileConsumer interface.
 *         LLM precompile at 0x0802 runs zai-org/GLM-4.7-FP8 inside a TEE — no API keys needed.
 */
abstract contract PrecompileConsumer {
    address internal constant LLM_INFERENCE_PRECOMPILE = address(0x0802);
    address internal constant HTTP_CALL_PRECOMPILE      = address(0x0801);

    /**
     * @notice Execute a native Ritual Chain precompile.
     * @param precompile  Address of the precompile (0x0801 HTTP, 0x0802 LLM).
     * @param input       ABI-encoded input payload for the precompile.
     * @return output     ABI-encoded result returned by the precompile in the same call frame.
     */
    function _executePrecompile(
        address precompile,
        bytes memory input
    ) internal returns (bytes memory output) {
        bool success;
        (success, output) = precompile.call(input);
        require(success, "PrecompileConsumer: precompile call failed");
    }
}
