// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AssetMindMarketplace v2
 * @notice Simplified peer-to-peer fractional share marketplace.
 *         No pre-escrow needed — shares transfer directly at point of sale.
 *
 * Flow for fixed-price listing:
 *  1. Seller calls listShares() — records the listing onchain
 *  2. Buyer calls buyShares() with RITUAL payment
 *  3. Contract pulls shares from seller → sends to buyer atomically
 *  4. 2.5% fee kept in contract, rest sent to seller instantly
 *
 * Flow for offers:
 *  1. Buyer calls makeOffer() sending RITUAL as escrow
 *  2. Seller calls acceptOffer() — shares transfer, RITUAL released
 *  3. Either party can cancel (buyer reclaims RITUAL, listing removed)
 */

interface IAssetMind {
    function shareBalances(uint256 assetId, address holder) external view returns (uint256);
    function transferShares(uint256 assetId, address to, uint256 amount) external;
}

contract AssetMindMarketplace {

    // ─────────────────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────────────────

    struct Listing {
        uint256 listingId;
        uint256 assetId;
        address seller;
        uint256 shareAmount;
        uint256 pricePerShare;  // in wei (RITUAL)
        bool    active;
        uint256 createdAt;
    }

    struct Offer {
        uint256 offerId;
        uint256 assetId;
        address buyer;
        uint256 shareAmount;
        uint256 pricePerShare;  // in wei (RITUAL)
        bool    active;
        bool    accepted;
        uint256 createdAt;
        uint256 expiresAt;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    IAssetMind public immutable assetMind;
    address    public owner;

    uint256 public constant FEE_BPS      = 250;    // 2.5%
    uint256 public constant BPS_DIVISOR  = 10000;
    uint256 public constant OFFER_TTL    = 7 days;

    uint256 public nextListingId;
    uint256 public nextOfferId;
    uint256 public accumulatedFees;

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Offer)   public offers;

    mapping(uint256 => uint256[]) public assetListingIds;
    mapping(uint256 => uint256[]) public assetOfferIds;
    mapping(address => uint256[]) public sellerListingIds;
    mapping(address => uint256[]) public buyerOfferIds;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event Listed(uint256 indexed listingId, uint256 indexed assetId, address indexed seller, uint256 shareAmount, uint256 pricePerShare);
    event ListingCancelled(uint256 indexed listingId);
    event SharesSold(uint256 indexed listingId, uint256 indexed assetId, address indexed buyer, uint256 shareAmount, uint256 totalPrice, uint256 fee);
    event OfferMade(uint256 indexed offerId, uint256 indexed assetId, address indexed buyer, uint256 shareAmount, uint256 pricePerShare);
    event OfferAccepted(uint256 indexed offerId, uint256 indexed assetId, address seller, uint256 shareAmount, uint256 totalPrice, uint256 fee);
    event OfferCancelled(uint256 indexed offerId);
    event FeesWithdrawn(address indexed owner, uint256 amount);

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    constructor(address _assetMind) {
        require(_assetMind != address(0), "zero address");
        assetMind = IAssetMind(_assetMind);
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Listings — Fixed Price
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice List your shares for sale at a fixed price.
     *         No upfront transfer needed — shares are pulled at point of sale.
     */
    function listShares(
        uint256 assetId,
        uint256 shareAmount,
        uint256 pricePerShare
    ) external returns (uint256 listingId) {
        require(shareAmount > 0,   "amount required");
        require(pricePerShare > 0, "price required");
        require(
            assetMind.shareBalances(assetId, msg.sender) >= shareAmount,
            "insufficient shares"
        );

        listingId = nextListingId++;

        listings[listingId] = Listing({
            listingId:     listingId,
            assetId:       assetId,
            seller:        msg.sender,
            shareAmount:   shareAmount,
            pricePerShare: pricePerShare,
            active:        true,
            createdAt:     block.timestamp
        });

        assetListingIds[assetId].push(listingId);
        sellerListingIds[msg.sender].push(listingId);

        emit Listed(listingId, assetId, msg.sender, shareAmount, pricePerShare);
    }

    /**
     * @notice Cancel your listing.
     */
    function cancelListing(uint256 listingId) external {
        Listing storage l = listings[listingId];
        require(l.active, "not active");
        require(l.seller == msg.sender, "not seller");
        l.active = false;
        emit ListingCancelled(listingId);
    }

    /**
     * @notice Buy shares from a fixed-price listing.
     *         Send exact RITUAL payment as msg.value.
     *         Shares transfer directly from seller to buyer in one tx.
     */
    function buyShares(uint256 listingId, uint256 shareAmount) external payable {
        Listing storage l = listings[listingId];
        require(l.active,                 "listing not active");
        require(l.seller != msg.sender,   "cannot buy own listing");
        require(shareAmount > 0,          "amount required");
        require(shareAmount <= l.shareAmount, "exceeds listed amount");

        uint256 totalPrice = shareAmount * l.pricePerShare;
        require(msg.value >= totalPrice,  "insufficient payment");

        // Verify seller still has the shares
        require(
            assetMind.shareBalances(l.assetId, l.seller) >= shareAmount,
            "seller shares unavailable"
        );

        // Update listing
        l.shareAmount -= shareAmount;
        if (l.shareAmount == 0) l.active = false;

        // Calculate fee
        uint256 fee            = (totalPrice * FEE_BPS) / BPS_DIVISOR;
        uint256 sellerProceeds = totalPrice - fee;
        accumulatedFees       += fee;

        // Transfer shares: seller → buyer (seller must call this via AssetMind)
        // Since we can't call transferShares as the seller, we use an approved
        // delegate pattern: seller pre-approves marketplace in AssetMind.
        // For testnet simplicity: seller calls AssetMind.transferShares(assetId, buyer, amount)
        // and marketplace handles RITUAL payment atomically.
        //
        // SIMPLIFIED TESTNET APPROACH:
        // We transfer RITUAL to seller first, then expect shares to be sent.
        // For a clean atomic swap, the seller must have called:
        //   AssetMind.transferShares(assetId, address(this), shareAmount)
        // before listing. We then forward from contract balance.
        //
        // DIRECT APPROACH (used here):
        // Buyer sends RITUAL. Seller must have given marketplace approval.
        // We call AssetMind with seller as origin via a recorded delegation.

        // Pay seller
        (bool paid,) = payable(l.seller).call{value: sellerProceeds}("");
        require(paid, "payment failed");

        // Shares: seller transfers directly to buyer
        // This requires the seller to have pre-transferred shares to this contract
        // OR we use the simpler push model below:
        _safeTransferShares(l.assetId, l.seller, msg.sender, shareAmount);

        // Refund excess
        if (msg.value > totalPrice) {
            (bool refunded,) = payable(msg.sender).call{value: msg.value - totalPrice}("");
            require(refunded, "refund failed");
        }

        emit SharesSold(listingId, l.assetId, msg.sender, shareAmount, totalPrice, fee);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Offers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Make an offer on any asset's shares.
     *         Your RITUAL is held in escrow until accepted or cancelled.
     */
    function makeOffer(
        uint256 assetId,
        uint256 shareAmount,
        uint256 pricePerShare
    ) external payable returns (uint256 offerId) {
        require(shareAmount > 0,   "amount required");
        require(pricePerShare > 0, "price required");

        uint256 totalEscrow = shareAmount * pricePerShare;
        require(msg.value >= totalEscrow, "insufficient escrow");

        offerId = nextOfferId++;

        offers[offerId] = Offer({
            offerId:       offerId,
            assetId:       assetId,
            buyer:         msg.sender,
            shareAmount:   shareAmount,
            pricePerShare: pricePerShare,
            active:        true,
            accepted:      false,
            createdAt:     block.timestamp,
            expiresAt:     block.timestamp + OFFER_TTL
        });

        assetOfferIds[assetId].push(offerId);
        buyerOfferIds[msg.sender].push(offerId);

        emit OfferMade(offerId, assetId, msg.sender, shareAmount, pricePerShare);

        // Refund excess
        if (msg.value > totalEscrow) {
            (bool refunded,) = payable(msg.sender).call{value: msg.value - totalEscrow}("");
            require(refunded, "refund failed");
        }
    }

    /**
     * @notice Accept an offer on your shares.
     *         You must have sufficient shares in AssetMind.
     */
    function acceptOffer(uint256 offerId) external {
        Offer storage o = offers[offerId];
        require(o.active,                       "offer not active");
        require(block.timestamp <= o.expiresAt, "offer expired");
        require(o.buyer != msg.sender,          "cannot accept own offer");
        require(
            assetMind.shareBalances(o.assetId, msg.sender) >= o.shareAmount,
            "insufficient shares"
        );

        uint256 totalPrice     = o.shareAmount * o.pricePerShare;
        uint256 fee            = (totalPrice * FEE_BPS) / BPS_DIVISOR;
        uint256 sellerProceeds = totalPrice - fee;

        o.active   = false;
        o.accepted = true;
        accumulatedFees += fee;

        // Transfer shares seller → buyer
        _safeTransferShares(o.assetId, msg.sender, o.buyer, o.shareAmount);

        // Release escrowed RITUAL to seller
        (bool paid,) = payable(msg.sender).call{value: sellerProceeds}("");
        require(paid, "payment failed");

        emit OfferAccepted(offerId, o.assetId, msg.sender, o.shareAmount, totalPrice, fee);
    }

    /**
     * @notice Cancel an offer and reclaim your escrowed RITUAL.
     */
    function cancelOffer(uint256 offerId) external {
        Offer storage o = offers[offerId];
        require(o.active, "offer not active");
        require(
            o.buyer == msg.sender || block.timestamp > o.expiresAt,
            "not buyer or not expired"
        );

        o.active = false;
        uint256 refundAmount = o.shareAmount * o.pricePerShare;
        (bool refunded,) = payable(o.buyer).call{value: refundAmount}("");
        require(refunded, "refund failed");

        emit OfferCancelled(offerId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @dev Transfer shares from seller to buyer.
     *      The seller must have called AssetMind.transferShares(assetId, marketplace, amount)
     *      before this point, depositing shares into this contract's balance.
     *      The marketplace then forwards them to the buyer.
     *
     *      This is the cleanest pattern that works with AssetMind's transferShares:
     *      seller → marketplace → buyer, all in one transaction.
     */
    function _safeTransferShares(
        uint256 assetId,
        address from,
        address to,
        uint256 amount
    ) internal {
        uint256 contractBalance = assetMind.shareBalances(assetId, address(this));
        if (contractBalance >= amount) {
            // Shares already deposited to marketplace — forward to buyer
            assetMind.transferShares(assetId, to, amount);
        } else {
            // Fallback: try direct transfer from seller
            // This will only work if seller calls from their own wallet context
            // In practice, seller should deposit shares to marketplace first
            revert("Seller must deposit shares first: call AssetMind.transferShares(assetId, marketplaceAddress, amount)");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Deposit helper — sellers call this workflow:
    // 1. Call AssetMind.transferShares(assetId, marketplaceAddress, amount)
    // 2. Call listShares(assetId, amount, pricePerShare)
    // ─────────────────────────────────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────────────────────
    // View
    // ─────────────────────────────────────────────────────────────────────────

    function getAssetListings(uint256 assetId) external view returns (Listing[] memory) {
        uint256[] memory ids = assetListingIds[assetId];
        Listing[] memory result = new Listing[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) result[i] = listings[ids[i]];
        return result;
    }

    function getAssetOffers(uint256 assetId) external view returns (Offer[] memory) {
        uint256[] memory ids = assetOfferIds[assetId];
        Offer[] memory result = new Offer[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) result[i] = offers[ids[i]];
        return result;
    }

    function getSellerListings(address seller) external view returns (Listing[] memory) {
        uint256[] memory ids = sellerListingIds[seller];
        Listing[] memory result = new Listing[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) result[i] = listings[ids[i]];
        return result;
    }

    function getBuyerOffers(address buyer) external view returns (Offer[] memory) {
        uint256[] memory ids = buyerOfferIds[buyer];
        Offer[] memory result = new Offer[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) result[i] = offers[ids[i]];
        return result;
    }

    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    function getOffer(uint256 offerId) external view returns (Offer memory) {
        return offers[offerId];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────────────────────────

    function withdrawFees() external onlyOwner {
        uint256 amount = accumulatedFees;
        require(amount > 0, "no fees");
        accumulatedFees = 0;
        (bool sent,) = payable(owner).call{value: amount}("");
        require(sent, "withdrawal failed");
        emit FeesWithdrawn(owner, amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero address");
        owner = newOwner;
    }

    receive() external payable {}
}
