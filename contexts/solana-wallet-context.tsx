"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import {
  ConnectionProvider,
  WalletProvider,
  useWallet as useSolanaWalletAdapter,
  useConnection,
} from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets"
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import { clusterApiUrl } from "@solana/web3.js"
import moralisService from "@/services/moralis"
import solanaRpcService from "@/services/solana-rpc"

// Import wallet adapter CSS
import "@solana/wallet-adapter-react-ui/styles.css"

// Create context
const SolanaWalletContext = createContext<any>(null)

// Wallet configuration
const getWalletConfig = () => {
  // Use mainnet for production
  const network = WalletAdapterNetwork.Mainnet

  // Use custom RPC URL if provided, otherwise use default
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(network)

  return {
    network,
    endpoint,
    wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    autoConnect: true,
  }
}

/**
 * Provider for Solana wallet functionality
 */
export const SolanaWalletProvider = ({ children }: { children: React.ReactNode }) => {
  const config = getWalletConfig()

  return (
    <ConnectionProvider endpoint={config.endpoint}>
      <WalletProvider wallets={config.wallets} autoConnect={config.autoConnect}>
        <WalletModalProvider>
          <SolanaWalletInnerProvider network={config.network}>{children}</SolanaWalletInnerProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

/**
 * Inner provider that handles wallet state and functionality
 */
const SolanaWalletInnerProvider = ({
  children,
  network,
}: {
  children: React.ReactNode
  network: WalletAdapterNetwork
}) => {
  const wallet = useSolanaWalletAdapter()
  const { connection } = useConnection()
  const [balance, setBalance] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [userNfts, setUserNfts] = useState<any[]>([])

  // Initialize Moralis when the component mounts
  useEffect(() => {
    const initializeMoralis = async () => {
      try {
        await moralisService.initMoralis()
      } catch (error) {
        console.error("Error initializing Moralis:", error)
      }
    }

    initializeMoralis()
  }, [])

  // Fetch balance when wallet changes
  useEffect(() => {
    const getBalance = async () => {
      if (wallet.connected && wallet.publicKey) {
        try {
          setIsLoading(true)
          const walletBalance = await connection.getBalance(wallet.publicKey)
          setBalance(walletBalance / 1e9) // Convert lamports to SOL
        } catch (error) {
          console.error("Error fetching balance:", error)
          setBalance(0)
        } finally {
          setIsLoading(false)
        }
      } else {
        setBalance(0)
      }
    }

    getBalance()
  }, [wallet.connected, wallet.publicKey, connection])

  // Fetch user NFTs when wallet changes
  useEffect(() => {
    const fetchUserNfts = async () => {
      if (wallet.connected && wallet.publicKey) {
        try {
          setIsLoading(true)

          // First check if we have cached NFTs
          const cachedNfts = localStorage.getItem(`nfts_${wallet.publicKey.toString()}`)
          if (cachedNfts) {
            const parsedNfts = JSON.parse(cachedNfts)
            const cacheTime = localStorage.getItem(`nfts_cache_time_${wallet.publicKey.toString()}`)

            // Use cache if it's less than 5 minutes old
            if (cacheTime && Date.now() - Number.parseInt(cacheTime) < 5 * 60 * 1000) {
              setUserNfts(parsedNfts)
              setIsLoading(false)

              // Fetch in background to update cache
              fetchAndUpdateNfts(wallet.publicKey.toString())
              return
            }
          }

          // Fetch fresh NFTs
          await fetchAndUpdateNfts(wallet.publicKey.toString())
        } catch (error) {
          console.error("Error in fetchUserNfts:", error)
          setUserNfts([])
        } finally {
          setIsLoading(false)
        }
      } else {
        setUserNfts([])
      }
    }

    const fetchAndUpdateNfts = async (address: string) => {
      try {
        // Try Moralis first
        console.log("Attempting to fetch NFTs from Moralis")
        let nfts = []

        try {
          nfts = await moralisService.getNFTsByOwner(address)
          console.log(`Moralis returned ${nfts.length} NFTs`)
        } catch (moralisError) {
          console.error("Moralis fetch failed:", moralisError)
        }

        // If Moralis returns empty or fails, try direct RPC as fallback
        if (!nfts || nfts.length === 0) {
          console.log("Moralis returned no NFTs, trying direct RPC fallback")
          try {
            nfts = await solanaRpcService.getNFTsByOwner(address)
            console.log(`Direct RPC returned ${nfts.length} NFTs`)
          } catch (rpcError) {
            console.error("Direct RPC fallback failed:", rpcError)
          }
        }

        // Combine results if we have any
        if (nfts && nfts.length > 0) {
          console.log(`Setting ${nfts.length} NFTs in state`)
          setUserNfts(nfts)

          // Cache the results
          localStorage.setItem(`nfts_${address}`, JSON.stringify(nfts))
          localStorage.setItem(`nfts_cache_time_${address}`, Date.now().toString())
        } else {
          console.log("No NFTs found from either source")
          setUserNfts([])
        }
      } catch (error) {
        console.error("Error in fetchAndUpdateNfts:", error)
        throw error
      }
    }

    fetchUserNfts()
  }, [wallet.connected, wallet.publicKey])

  /**
   * Send SOL to a recipient
   * @param {string} recipient - Recipient address
   * @param {number} amount - Amount in SOL
   * @returns {Promise<string>} Transaction signature
   */
  const sendSol = async (recipient: string, amount: number) => {
    if (!wallet.connected || !wallet.publicKey) {
      throw new Error("Wallet not connected")
    }

    try {
      setIsLoading(true)

      // Create transaction for sending SOL
      const transaction = await connection.getRecentBlockhash("confirmed")
      const lamportsAmount = amount * 1e9 // Convert SOL to lamports

      const tx = {
        recentBlockhash: transaction.blockhash,
        feePayer: wallet.publicKey,
        instructions: [
          {
            // @ts-expect-error dsada
            programId: connection.programId,
            keys: [
              { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
              { pubkey: recipient, isSigner: false, isWritable: true },
            ],
            data: Buffer.from(lamportsAmount.toString()),
          },
        ],
      }

      // Sign and send transaction
       // @ts-expect-error dsada
      const signature = await wallet.sendTransaction(tx, connection)
      await connection.confirmTransaction(signature, "confirmed")

      // Refresh balance
      const walletBalance = await connection.getBalance(wallet.publicKey)
      setBalance(walletBalance / 1e9)

      return signature
    } catch (error) {
      console.error("Error sending SOL:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Create context value
  const value = {
    wallet,
    network,
    balance,
    isLoading,
    userNfts,
    sendSol,
    connection,
  }

  return <SolanaWalletContext.Provider value={value}>{children}</SolanaWalletContext.Provider>
}

/**
 * Hook for using the Solana wallet context
 * @returns {Object} Wallet context
 */
export const useSolanaWallet = () => {
  const context = useContext(SolanaWalletContext)

  if (!context) {
    throw new Error("useSolanaWallet must be used within a SolanaWalletProvider")
  }

  return context
}

export default SolanaWalletContext
