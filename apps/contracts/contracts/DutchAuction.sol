// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title DutchAuction
 * @notice Implements Phase 1 of FluxPad: A Fair Launch Auction on Monad.
 * Everyone pays the same final clearing price.
 */
contract DutchAuction is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable tokenForSale;
    uint256 public immutable totalTokensForSale;
    uint256 public immutable startPrice;
    uint256 public immutable minPrice;
    uint256 public immutable startTime;
    uint256 public immutable endTime;
    uint256 public immutable duration;

    uint256 public totalCommitted;
    uint256 public clearingPrice;
    bool public finalized;

    mapping(address => uint256) public commitments;

    event Committed(address indexed user, uint256 amount);
    event AuctionFinalized(uint256 clearingPrice);
    event Claimed(address indexed user, uint256 tokens, uint256 refund);

    constructor(
        address _tokenForSale,
        uint256 _totalTokensForSale,
        uint256 _startPrice,
        uint256 _minPrice,
        uint256 _startTime,
        uint256 _duration
    ) Ownable(msg.sender) {
        require(_tokenForSale != address(0), "Invalid token");
        require(_totalTokensForSale > 0, "Zero tokens");
        require(_startPrice > _minPrice, "Invalid price range");
        require(_startTime >= block.timestamp, "Invalid start time");
        require(_duration > 0, "Invalid duration");

        tokenForSale = IERC20(_tokenForSale);
        totalTokensForSale = _totalTokensForSale;
        startPrice = _startPrice;
        minPrice = _minPrice;
        startTime = _startTime;
        endTime = _startTime + _duration;
        duration = _duration;
    }

    /**
     * @notice Calculates the current price based on elapsed time.
     * Math: CurrentPrice = P_start - ((P_start - P_min) * (CurrentTime - StartTime) / Duration)
     */
    function getCurrentPrice() public view returns (uint256) {
        if (block.timestamp < startTime) return startPrice;
        if (block.timestamp >= endTime) return minPrice;

        uint256 elapsed = block.timestamp - startTime;
        uint256 priceDiff = startPrice - minPrice;
        uint256 decay = (priceDiff * elapsed) / duration;
        
        return startPrice - decay;
    }

    /**
     * @notice Commit MON (native token) to the auction.
     */
    function commit() external payable nonReentrant {
        require(block.timestamp >= startTime, "Auction not started");
        require(block.timestamp < endTime, "Auction ended");
        require(msg.value > 0, "Zero commitment");

        commitments[msg.sender] += msg.value;
        totalCommitted += msg.value;

        emit Committed(msg.sender, msg.value);
    }

    /**
     * @notice Finalize the auction and calculate the clearing price.
     * Clearing Price = totalCommitted / totalTokensForSale, but not less than minPrice.
     */
    function finalize() external onlyOwner {
        require(block.timestamp >= endTime, "Auction not ended");
        require(!finalized, "Already finalized");

        uint256 calculatedPrice = totalCommitted / totalTokensForSale;
        clearingPrice = calculatedPrice < minPrice ? minPrice : calculatedPrice;
        finalized = true;

        emit AuctionFinalized(clearingPrice);
    }

    /**
     * @notice Claim tokens and refund after finalization.
     */
    function claim() external nonReentrant {
        require(finalized, "Not finalized");
        uint256 commitment = commitments[msg.sender];
        require(commitment > 0, "No commitment");

        commitments[msg.sender] = 0;

        uint256 tokensToReceive = (commitment * 1e18) / clearingPrice;
        uint256 cost = (tokensToReceive * clearingPrice) / 1e18;
        uint256 refund = commitment > cost ? commitment - cost : 0;

        if (tokensToReceive > 0) {
            tokenForSale.safeTransfer(msg.sender, tokensToReceive);
        }

        if (refund > 0) {
            (bool success, ) = payable(msg.sender).call{value: refund}("");
            require(success, "Refund failed");
        }

        emit Claimed(msg.sender, tokensToReceive, refund);
    }

    // Function to withdraw committed funds (for owner)
    function withdrawFunds() external onlyOwner {
        require(finalized, "Not finalized");
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }
}
