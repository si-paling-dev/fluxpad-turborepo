import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("DutchAuction", function () {
  async function deployAuctionFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockToken");
    const token = await MockToken.deploy();

    const startPrice = ethers.parseEther("10"); // 10 MON
    const minPrice = ethers.parseEther("2");   // 2 MON
    const totalTokens = ethers.parseEther("1000");
    const duration = 24 * 60 * 60; // 24 hours
    const startTime = await time.latest() + 60; // Starts in 1 minute

    const DutchAuction = await ethers.getContractFactory("DutchAuction");
    const auction = await DutchAuction.deploy(
      await token.getAddress(),
      totalTokens,
      startPrice,
      minPrice,
      startTime,
      duration
    );

    // Transfer tokens to auction contract
    await token.transfer(await auction.getAddress(), totalTokens);

    return { auction, token, owner, otherAccount, startPrice, minPrice, startTime, duration, totalTokens };
  }

  describe("Deployment", function () {
    it("Should set the right parameters", async function () {
      const { auction, startPrice, minPrice, startTime, duration } = await deployAuctionFixture();
      expect(await auction.startPrice()).to.equal(startPrice);
      expect(await auction.minPrice()).to.equal(minPrice);
      expect(await auction.startTime()).to.equal(startTime);
      expect(await auction.duration()).to.equal(duration);
    });
  });

  describe("Price Calculation", function () {
    it("Should return start price before auction starts", async function () {
      const { auction, startPrice } = await deployAuctionFixture();
      expect(await auction.getCurrentPrice()).to.equal(startPrice);
    });

    it("Should decay price over time", async function () {
      const { auction, startPrice, minPrice, startTime, duration } = await deployAuctionFixture();
      
      await time.increaseTo(startTime + duration / 2);
      const midPrice = await auction.getCurrentPrice();
      
      expect(midPrice).to.be.lessThan(startPrice);
      expect(midPrice).to.be.greaterThan(minPrice);
      // Mid price should be approx (10 + 2) / 2 = 6
      expect(midPrice).to.be.closeTo(ethers.parseEther("6"), ethers.parseEther("0.1"));
    });

    it("Should return min price after auction ends", async function () {
      const { auction, minPrice, startTime, duration } = await deployAuctionFixture();
      await time.increaseTo(startTime + duration + 1);
      expect(await auction.getCurrentPrice()).to.equal(minPrice);
    });
  });

  describe("Committing", function () {
    it("Should allow users to commit MON", async function () {
      const { auction, startTime, otherAccount } = await deployAuctionFixture();
      await time.increaseTo(startTime + 1);
      
      const commitAmount = ethers.parseEther("1");
      await expect(auction.connect(otherAccount).commit({ value: commitAmount }))
        .to.emit(auction, "Committed")
        .withArgs(otherAccount.address, commitAmount);
      
      expect(await auction.commitments(otherAccount.address)).to.equal(commitAmount);
      expect(await auction.totalCommitted()).to.equal(commitAmount);
    });
  });

  describe("Finalization and Claiming", function () {
    it("Should calculate clearing price correctly", async function () {
      const { auction, startTime, duration, otherAccount, totalTokens } = await deployAuctionFixture();
      await time.increaseTo(startTime + 1);
      
      // Commit 5000 MON for 1000 tokens -> Price should be 5 MON
      const commitAmount = ethers.parseEther("5000");
      await auction.connect(otherAccount).commit({ value: commitAmount });
      
      await time.increaseTo(startTime + duration + 1);
      await auction.finalize();
      
      expect(await auction.clearingPrice()).to.equal(ethers.parseEther("5"));
      expect(await auction.finalized()).to.be.true;
    });

    it("Should allow claiming tokens and refunds", async function () {
      const { auction, token, startTime, duration, otherAccount } = await deployAuctionFixture();
      await time.increaseTo(startTime + 1);
      
      const commitAmount = ethers.parseEther("5000");
      await auction.connect(otherAccount).commit({ value: commitAmount });
      
      await time.increaseTo(startTime + duration + 1);
      await auction.finalize();
      
      const initialTokenBalance = await token.balanceOf(otherAccount.address);
      await auction.connect(otherAccount).claim();
      const finalTokenBalance = await token.balanceOf(otherAccount.address);
      
      // With 5000 MON committed and clearing price 5 MON, should get 1000 tokens
      expect(finalTokenBalance - initialTokenBalance).to.equal(ethers.parseEther("1000"));
    });
  });
});
