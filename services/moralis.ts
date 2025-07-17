"use client"

import Moralis from "moralis"

let moralisInitialized = false // Module-level singleton guard

class MoralisService {
  /**
   * Initialize Moralis
   */
  async initMoralis(): Promise<void> {
    if (moralisInitialized) return

    try {
      const apiKey = process.env.NEXT_PUBLIC_MORALIS_API_KEY

      if (!apiKey) {
        throw new Error("Moralis API key is not defined")
      }

      await Moralis.start({ apiKey })
      moralisInitialized = true
      console.log("Moralis initialized successfully")
    } catch (error) {
      console.error("Error initializing Moralis:", error)
      throw error
    }
  }

  async getNFTsByOwner(address: string): Promise<any[]> {
    try {
      await this.initMoralis()

      const network = "mainnet"

      console.log(`Fetching NFTs for address ${address} on ${network} network`)
      // @ts-expect-error
      const response = await Moralis.SolanaApi.account.getNFTs({ address, network })

      if (response?.result) {
        console.log(`Successfully fetched ${response.result.length} NFTs from Moralis`)
        return response.result
      } else {
        console.log("No NFTs found or empty response from Moralis")
        return []
      }
    } catch (error) {
      console.error("Error fetching NFTs by owner from Moralis:", error)
      throw error
    }
  }

  async getNFTMetadata(address: string): Promise<any> {
    try {
      await this.initMoralis()

      const network = "mainnet"

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

  async getNFTsByCollection(collectionAddress: string): Promise<any[]> {
    try {
      return []
    } catch (error) {
      console.error("Error fetching NFTs by collection:", error)
      return []
    }
  }
}

const moralisService = new MoralisService()
export default moralisService
