"use client"

import Moralis from "moralis"

/**
 * Service for interacting with Moralis for Solana data
 */
class MoralisService {
  private isInitialized = false

  /**
   * Initialize Moralis
   */
  async initMoralis(): Promise<void> {
    if (this.isInitialized) return

    try {
      const apiKey = process.env.NEXT_PUBLIC_MORALIS_API_KEY

      if (!apiKey) {
        throw new Error("Moralis API key is not defined")
      }

      await Moralis.start({
        apiKey,
      })

      this.isInitialized = true
      console.log("Moralis initialized successfully")
    } catch (error) {
      console.error("Error initializing Moralis:", error)
      throw error
    }
  }

  /**
   * Get NFTs owned by an address
   * @param address Wallet address
   * @returns Array of NFTs
   */
  async getNFTsByOwner(address: string): Promise<any[]> {
    try {
      if (!this.isInitialized) {
        console.log("Initializing Moralis before fetching NFTs")
        await this.initMoralis()
      }

      const network = "mainnet" // Using mainnet

      console.log(`Fetching NFTs for address ${address} on ${network} network`)
       // @ts-expect-error dsada
      const response = await Moralis.SolanaApi.account.getNFTs({
        address,
        network,
      })

      if (response?.result) {
        console.log(`Successfully fetched ${response.result.length} NFTs from Moralis`)
        return response.result
      } else {
        console.log("No NFTs found or empty response from Moralis")
        return []
      }
    } catch (error) {
      console.error("Error fetching NFTs by owner from Moralis:", error)
      throw error // Propagate error to be handled by caller
    }
  }

  /**
   * Get NFT metadata
   * @param address NFT mint address
   * @returns NFT metadata
   */
  async getNFTMetadata(address: string): Promise<any> {
    try {
      if (!this.isInitialized) {
        await this.initMoralis()
      }

      const network = "mainnet" // Using mainnet

      const response = await Moralis.SolApi.nft.getNFTMetadata({
        address,
        network,
      })
      console.log(`Fetched metadata for NFT ${address}:`, response)
      return response || null
    } catch (error) {
      console.error("Error fetching NFT metadata:", error)
      return null
    }
  }

  /**
   * Get NFTs in a collection
   * @param collectionAddress Collection mint address
   * @returns Array of NFTs
   */
  async getNFTsByCollection(collectionAddress: string): Promise<any[]> {
    try {
      // This is a simplified approach
      // In a real implementation, you would query an indexer or database
      // to find NFTs that belong to a specific collection

      // For now, we'll return an empty array
      return []
    } catch (error) {
      console.error("Error fetching NFTs by collection:", error)
      return []
    }
  }
}

// Create and export a singleton instance
const moralisService = new MoralisService()
export default moralisService
