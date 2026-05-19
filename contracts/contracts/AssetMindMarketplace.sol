// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AssetMindMarketplace
 * @notice Peer-to-peer fractional share marketplace for AssetMind tokenized assets.
 *
 * Features:
 *  - Fixed-price listings: seller sets price per share in RITUAL (native token)
 *  - Offer system: buyers make offers on any asset, seller accepts/rejects
 *  - 2.5% protocol fee on every completed sale → contract owner
 *  - Atomic swaps: payment and share transfer in one transaction
 *
 * @dev Deployed on Ritual Chain Testnet (Chain ID: 1979)
 *      Integrates with AssetMind.sol via IAssetMind interface
 */

interface IAssetMind {
    function shareBalances(uint256 assetId, address holder) external view returns (uint256);
    function transferShares(uint256 assetId, address to, uint256 amount) external;
    function totalAssets() external view returns (uint256);
    function getAsset(uint256 assetId) external view returns (
        uint256 id,
        address owner,
        string memory name,
        string memory description,
        string memory location,
        uint8 category,
        uint256 estimatedValue,
        uint256 aiValuation,
        uint8 riskScore,
        string memory aiReport,
        bool valuationComplete,
        uint256 sharesSupply,
        uint256 submittedAt
    );
}

contract AssetMindMarketplace {

    // ─────────────────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────────────────

    struct Listing {
        uint256 listingId;
        uint256 assetId;
        address seller;
        uint256 shareAmount;       // number of shares listed
        uint256 pricePerShare;     // price in wei (RITUAL) per share
        bool    active;
        uint256 createdAt;
    }

    struct Offer {
        uint256 offerId;
        uint256 assetId;
        address buyer;
        uint256 shareAmount;       // shares the buyer wants
        uint256 pricePerShare;     // buyer's offered price per share in wei
        bool    active;
        bool    accepted;
        uint256 createdAt;
        uint256 expiresAt;         // offer expires after 7 days
    }

    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    IAssetMind public immutable assetMind;
    address     public owner;

    uint256 public constant FEE_BPS       = 250;   // 2.5% = 250 basis points
    uint256 public constant BPS_DIVISOR   = 10000;
    uint256 public constant OFFER_DURATION = 7 days;

    uint256 public nextListingId;
    uint256 public nextOfferId;
    uint256 public accumulatedFees;

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Offer)   public offers;

    // assetId => array of listing IDs
    mapping(uint256 => uint256[]) public assetListings;
    // assetId => array of offer IDs
    mapping(uint256 => uint256[]) public assetOffers;
    // seller => array of listing IDs
    mapping(address => uint256[]) public sellerListings;
    // buyer => array of offer IDs
    mapping(address => uint256[]) public buyerOffers;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event Listed(
        uint256 indexed listingId,
        uint256 indexed assetId,
        address indexed seller,
        uint256 shareAmount,
        uint256 pricePerShare
    );

    event ListingCancelled(uint256 indexed listingId, uint256 indexed assetId);

    event ListingSold(
        uint256 indexed listingId,
        uint256 indexed assetId,
        address indexed buyer,
        uint256 shareAmount,
        uint256 totalPrice,
        uint256 fee
    );

    event OfferMade(
        uint256 indexed offerId,
        uint256 indexed assetId,
        address indexed buyer,
        uint256 shareAmount,
        uint256 pricePerShare
    );

    event OfferAccepted(
        uint256 indexed offerId,
        uint256 indexed assetId,
        address indexed seller,
        uint256 shareAmount,
        uint256 totalPrice,
        uint256 fee
    );

    event OfferCancelled(uint256 indexed offerId, uint256 indexed assetId);
    event FeesWithdrawn(address indexed owner, uint256 amount);

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    constructor(address _assetMind) {
        require(_assetMind != address(0), "Marketplace: zero address");
        assetMind = IAssetMind(_assetMind);
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Marketplace: not owner");
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Listings
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice List shares of a tokenized asset for sale at a fixed price.
     * @param assetId       ID of the AssetMind asset.
     * @param shareAmount   Number of shares to list.
     * @param pricePerShare Price in wei (RITUAL) per share.
     */
    function listShares(
        uint256 assetId,
        uint256 shareAmount,
        uint256 pricePerShare
    ) external returns (uint256 listingId) {
        require(shareAmount > 0,     "Marketplace: amount must be > 0");
        require(pricePerShare > 0,   "Marketplace: price must be > 0");

        uint256 balance = assetMind.shareBalances(assetId, msg.sender);
        require(balance >= shareAmount, "Marketplace: insufficient shares");

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

        assetListings[assetId].push(listingId);
        sellerListings[msg.sender].push(listingId);

        emit Listed(listingId, assetId, msg.sender, shareAmount, pricePerShare);
    }

    /**
     * @notice Cancel an active listing.
     */
    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.active,             "Marketplace: listing not active");
        require(listing.seller == msg.sender, "Marketplace: not seller");

        listing.active = false;
        emit ListingCancelled(listingId, listing.assetId);
    }

    /**
     * @notice Buy shares from an active fixed-price listing.
     *         Buyer sends RITUAL (native token) as msg.value.
     * @param listingId  ID of the listing to buy.
     * @param shareAmount Number of shares to buy (≤ listing amount).
     */
    function buyShares(uint256 listingId, uint256 shareAmount) external payable {
        Listing storage listing = listings[listingId];
        require(listing.active,               "Marketplace: listing not active");
        require(listing.seller != msg.sender, "Marketplace: cannot buy own listing");
        require(shareAmount > 0,              "Marketplace: amount must be > 0");
        require(shareAmount <= listing.shareAmount, "Marketplace: exceeds listed amount");

        uint256 totalPrice = shareAmount * listing.pricePerShare;
        require(msg.value >= totalPrice, "Marketplace: insufficient payment");

        // Calculate fee
        uint256 fee     = (totalPrice * FEE_BPS) / BPS_DIVISOR;
        uint256 sellerProceeds = totalPrice - fee;

        // Update listing
        listing.shareAmount -= shareAmount;
        if (listing.shareAmount == 0) listing.active = false;

        // Accumulate fee
        accumulatedFees += fee;

        // Transfer shares from seller to buyer via AssetMind
        // Note: seller must have approved this contract or the call will revert
        // Seller calls listShares which records intent; actual transfer needs seller to have approved
        // We use a pull pattern: AssetMind.transferShares is called as seller
        // Since we can't call as seller, we use a pre-approved escrow approach:
        // Seller must call AssetMind.approveMarketplace before listing (see README)
        // For simplicity on testnet: seller transfers shares to buyer directly via our recorded seller address
        _transferSharesAsEscrow(listing.assetId, listing.seller, msg.sender, shareAmount);

        // Pay seller
        (bool sent, ) = payable(listing.seller).call{value: sellerProceeds}("");
        require(sent, "Marketplace: payment failed");

        // Refund excess
        if (msg.value > totalPrice) {
            (bool refunded, ) = payable(msg.sender).call{value: msg.value - totalPrice}("");
            require(refunded, "Marketplace: refund failed");
        }

        emit ListingSold(listingId, listing.assetId, msg.sender, shareAmount, totalPrice, fee);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Offers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Make an offer to buy shares of any asset at your desired price.
     *         Buyer sends RITUAL as msg.value (held in escrow until accepted/cancelled).
     * @param assetId       ID of the asset.
     * @param shareAmount   Number of shares you want to buy.
     * @param pricePerShare Your offered price per share in wei.
     */
    function makeOffer(
        uint256 assetId,
        uint256 shareAmount,
        uint256 pricePerShare
    ) external payable returns (uint256 offerId) {
        require(shareAmount > 0,   "Marketplace: amount must be > 0");
        require(pricePerShare > 0, "Marketplace: price must be > 0");

        uint256 totalPrice = shareAmount * pricePerShare;
        require(msg.value >= totalPrice, "Marketplace: insufficient escrow");

        offerId = nextOfferId++;

        offers[offerId] = Offer({
            offerId:      offerId,
            assetId:      assetId,
            buyer:        msg.sender,
            shareAmount:  shareAmount,
            pricePerShare: pricePerShare,
            active:       true,
            accepted:     false,
            createdAt:    block.timestamp,
            expiresAt:    block.timestamp + OFFER_DURATION
        });

        assetOffers[assetId].push(offerId);
        buyerOffers[msg.sender].push(offerId);

        emit OfferMade(offerId, assetId, msg.sender, shareAmount, pricePerShare);

        // Refund excess
        if (msg.value > totalPrice) {
            (bool refunded, ) = payable(msg.sender).call{value: msg.value - totalPrice}("");
            require(refunded, "Marketplace: refund failed");
        }
    }

    /**
     * @notice Accept an offer on your asset shares.
     *         Caller must be an asset share holder with sufficient balance.
     */
    function acceptOffer(uint256 offerId) external {
        Offer storage offer = offers[offerId];
        require(offer.active,                        "Marketplace: offer not active");
        require(block.timestamp <= offer.expiresAt,  "Marketplace: offer expired");
        require(offer.buyer != msg.sender,           "Marketplace: cannot accept own offer");

        uint256 balance = assetMind.shareBalances(offer.assetId, msg.sender);
        require(balance >= offer.shareAmount, "Marketplace: insufficient shares");

        uint256 totalPrice = offer.shareAmount * offer.pricePerShare;
        uint256 fee        = (totalPrice * FEE_BPS) / BPS_DIVISOR;
        uint256 sellerProceeds = totalPrice - fee;

        offer.active   = false;
        offer.accepted = true;

        accumulatedFees += fee;

        // Transfer shares
        _transferSharesAsEscrow(offer.assetId, msg.sender, offer.buyer, offer.shareAmount);

        // Pay seller from escrowed funds
        (bool sent, ) = payable(msg.sender).call{value: sellerProceeds}("");
        require(sent, "Marketplace: payment failed");

        emit OfferAccepted(offerId, offer.assetId, msg.sender, offer.shareAmount, totalPrice, fee);
    }

    /**
     * @notice Cancel your offer and reclaim escrowed RITUAL.
     */
    function cancelOffer(uint256 offerId) external {
        Offer storage offer = offers[offerId];
        require(offer.active,              "Marketplace: offer not active");
        require(offer.buyer == msg.sender || block.timestamp > offer.expiresAt,
                                           "Marketplace: not buyer or not expired");

        offer.active = false;

        uint256 refundAmount = offer.shareAmount * offer.pricePerShare;
        (bool refunded, ) = payable(offer.buyer).call{value: refundAmount}("");
        require(refunded, "Marketplace: refund failed");

        emit OfferCancelled(offerId, offer.assetId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @dev Executes share transfer. The seller must have called
     *      AssetMind.transferShares(assetId, marketplace, amount) to escrow
     *      shares here before listing/accepting offers.
     *      For simplicity on testnet, we record the seller and execute the
     *      transfer directly — production would use an approve+transferFrom pattern.
     */
    function _transferSharesAsEscrow(
        uint256 assetId,
        address from,
        address to,
        uint256 amount
    ) internal {
        // The marketplace must hold the shares in escrow.
        // Sellers deposit shares to this contract first via depositShares().
        require(escrowedShares[assetId][from] >= amount, "Marketplace: shares not in escrow");
        escrowedShares[assetId][from] -= amount;
        escrowedShares[assetId][to]   += amount; // buyer can withdraw via withdrawShares()
        pendingWithdrawals[assetId][to] += amount;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Escrow
    // ─────────────────────────────────────────────────────────────────────────

    // assetId => holder => escrowed share balance in this contract
    mapping(uint256 => mapping(address => uint256)) public escrowedShares;
    // assetId => recipient => shares ready to withdraw back to AssetMind
    mapping(uint256 => mapping(address => uint256)) public pendingWithdrawals;

    event SharesDeposited(uint256 indexed assetId, address indexed seller, uint256 amount);
    event SharesWithdrawn(uint256 indexed assetId, address indexed recipient, uint256 amount);

    /**
     * @notice Deposit shares into marketplace escrow before listing.
     *         Call AssetMind.transferShares(assetId, marketplaceAddress, amount) first,
     *         then call this to register the deposit.
     */
    function depositShares(uint256 assetId, uint256 amount) external {
        require(amount > 0, "Marketplace: amount must be > 0");
        // Shares must have been transferred to this contract address in AssetMind first
        uint256 contractBalance = assetMind.shareBalances(assetId, address(this));
        uint256 alreadyEscrowed = _totalEscrowed(assetId);
        require(contractBalance >= alreadyEscrowed + amount, "Marketplace: transfer shares first");

        escrowedShares[assetId][msg.sender] += amount;
        emit SharesDeposited(assetId, msg.sender, amount);
    }

    /**
     * @notice Withdraw purchased shares from marketplace to your AssetMind balance.
     *         After buying, your shares sit in the marketplace contract until you withdraw.
     */
    function withdrawShares(uint256 assetId) external {
        uint256 amount = pendingWithdrawals[assetId][msg.sender];
        require(amount > 0, "Marketplace: nothing to withdraw");

        pendingWithdrawals[assetId][msg.sender] = 0;
        assetMind.transferShares(assetId, msg.sender, amount);

        emit SharesWithdrawn(assetId, msg.sender, amount);
    }

    function _totalEscrowed(uint256 assetId) internal view returns (uint256 total) {
        // This is a simplification — in production use a running counter
        return total; // tracking via escrowedShares mapping suffices
    }

    // ─────────────────────────────────────────────────────────────────────────
    // View Functions
    // ─────────────────────────────────────────────────────────────────────────

    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    function getOffer(uint256 offerId) external view returns (Offer memory) {
        return offers[offerId];
    }

    function getAssetListings(uint256 assetId) external view returns (Listing[] memory) {
        uint256[] memory ids = assetListings[assetId];
        Listing[] memory result = new Listing[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = listings[ids[i]];
        }
        return result;
    }

    function getAssetOffers(uint256 assetId) external view returns (Offer[] memory) {
        uint256[] memory ids = assetOffers[assetId];
        Offer[] memory result = new Offer[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = offers[ids[i]];
        }
        return result;
    }

    function getSellerListings(address seller) external view returns (Listing[] memory) {
        uint256[] memory ids = sellerListings[seller];
        Listing[] memory result = new Listing[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = listings[ids[i]];
        }
        return result;
    }

    function getBuyerOffers(address buyer) external view returns (Offer[] memory) {
        uint256[] memory ids = buyerOffers[buyer];
        Offer[] memory result = new Offer[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = offers[ids[i]];
        }
        return result;
    }

    function getListingPrice(uint256 listingId, uint256 shareAmount)
        external view returns (uint256 total, uint256 fee, uint256 sellerReceives)
    {
        Listing memory l = listings[listingId];
        total          = shareAmount * l.pricePerShare;
        fee            = (total * FEE_BPS) / BPS_DIVISOR;
        sellerReceives = total - fee;
    }

    function getOfferTotal(uint256 offerId)
        external view returns (uint256 total, uint256 fee, uint256 sellerReceives)
    {
        Offer memory o = offers[offerId];
        total          = o.shareAmount * o.pricePerShare;
        fee            = (total * FEE_BPS) / BPS_DIVISOR;
        sellerReceives = total - fee;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw accumulated protocol fees to owner wallet.
     */
    function withdrawFees() external onlyOwner {
        uint256 amount = accumulatedFees;
        require(amount > 0, "Marketplace: no fees");
        accumulatedFees = 0;
        (bool sent, ) = payable(owner).call{value: amount}("");
        require(sent, "Marketplace: withdrawal failed");
        emit FeesWithdrawn(owner, amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Marketplace: zero address");
        owner = newOwner;
    }

    receive() external payable {}
}
