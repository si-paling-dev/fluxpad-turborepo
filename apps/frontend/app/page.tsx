'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { cn } from './lib/utils'
import { Rocket, Wallet, Clock, TrendingDown, Info } from 'lucide-react'

// Mock Auction Data for Phase 1 UI
const MOCK_AUCTION = {
  startPrice: 10.0,
  minPrice: 2.0,
  startTime: 1781000000, // Fixed timestamp (approx June 9, 2026) to avoid hydration mismatch
  duration: 86400, // 24 hours
  totalTokens: 1000000,
  tokenSymbol: 'FLUX'
}

export default function AuctionPage() {
  const [currentPrice, setCurrentPrice] = useState(MOCK_AUCTION.startPrice)
  const [timeLeft, setTimeLeft] = useState('')
  const [commitment, setCommitment] = useState('')
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000)
      const elapsed = now - MOCK_AUCTION.startTime
      
      if (elapsed < 0) {
        setCurrentPrice(MOCK_AUCTION.startPrice)
        setTimeLeft('Starting soon...')
      } else if (elapsed >= MOCK_AUCTION.duration) {
        setCurrentPrice(MOCK_AUCTION.minPrice)
        setTimeLeft('Ended')
      } else {
        const priceDiff = MOCK_AUCTION.startPrice - MOCK_AUCTION.minPrice
        const decay = (priceDiff * elapsed) / MOCK_AUCTION.duration
        setCurrentPrice(MOCK_AUCTION.startPrice - decay)
        
        const remaining = MOCK_AUCTION.duration - elapsed
        const hours = Math.floor(remaining / 3600)
        const minutes = Math.floor((remaining % 3600) / 60)
        const seconds = remaining % 60
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleConnect = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' })
        setIsConnected(true)
      } catch (err) {
        console.error(err)
      }
    } else {
      alert('Please install MetaMask!')
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex justify-between items-center border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 p-2 rounded-xl">
              <Rocket className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white/90">FluxPad</h1>
          </div>
          <button 
            onClick={handleConnect}
            className={cn(
              "px-6 py-2.5 rounded-full font-medium transition-all flex items-center gap-2 border",
              isConnected 
                ? "bg-green-500/10 border-green-500/50 text-green-400" 
                : "bg-white text-black hover:bg-white/90"
            )}
          >
            <Wallet className="w-4 h-4" />
            {isConnected ? 'Connected' : 'Connect Wallet'}
          </button>
        </header>

        {/* Hero / Auction Status */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
            <div className="space-y-1">
              <p className="text-white/40 text-sm font-medium uppercase tracking-wider">Current Price</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                  {currentPrice.toFixed(4)}
                </span>
                <span className="text-xl font-bold text-white/40">MON</span>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 text-white/40 text-xs mb-1">
                  <Clock className="w-3 h-3" />
                  ENDS IN
                </div>
                <div className="text-lg font-mono font-bold">{timeLeft}</div>
              </div>
              <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 text-white/40 text-xs mb-1">
                  <TrendingDown className="w-3 h-3" />
                  PRICE DECAY
                </div>
                <div className="text-lg font-bold">Linear</div>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <div className="relative">
                <input 
                  type="number" 
                  value={commitment}
                  onChange={(e) => setCommitment(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-xl font-bold focus:outline-none focus:border-purple-500 transition-colors"
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-white/40 font-bold">MON</span>
              </div>
              <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-4 rounded-2xl font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-purple-500/20">
                Commit to Auction
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Info className="w-5 h-5 text-purple-400" />
                Fair Launch Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-white/40">Token for Sale</span>
                  <span className="font-medium">{MOCK_AUCTION.totalTokens.toLocaleString()} {MOCK_AUCTION.tokenSymbol}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-white/40">Start Price</span>
                  <span className="font-medium">{MOCK_AUCTION.startPrice} MON</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-white/40">Reserve Price</span>
                  <span className="font-medium">{MOCK_AUCTION.minPrice} MON</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-white/40">Clearing Method</span>
                  <span className="font-medium text-purple-400">Unified Final Price</span>
                </div>
              </div>
            </div>

            <div className="bg-purple-600/10 border border-purple-500/20 rounded-3xl p-6">
              <p className="text-sm text-purple-300/80 leading-relaxed">
                <strong className="text-purple-300 block mb-1">How it works:</strong>
                In a Dutch Auction, the price starts high and decreases over time. 
                Everyone pays the same final clearing price at the end. If the 
                clearing price is lower than your bid, you get a refund for the difference.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
