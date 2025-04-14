"use client"

import { Connection, PublicKey } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import pinataService from "./pinata"

// Metaplex token metadata program ID (hardcoded to avoid import issues)
const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")

/**
 * Service for direct Solana RPC calls as a fallback for Moralis
 */
class SolanaRpcService {
  private connection: Connection | null = null

  /**
   * Initialize connection
   */
  private getConnection(): Connection {
    if (!this.connection) {
      const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://holy-small-pond.solana-mainnet.quiknode.pro/efac6c65c498a1f6e31d84ef30f9b4c8894b601d/"
      this.connection = new Connection(endpoint, "confirmed")
    }
    return this.connection
  }

  /**
   * Get NFTs owned by a wallet address directly from Solana
   * @param walletAddress The wallet address
   * @returns Array of NFTs
   */
  async getNFTsByOwner(walletAddress: string): Promise<any[]> {
    try {
      console.log("Fetching NFTs directly from Solana RPC for wallet:", walletAddress)
      const connection = this.getConnection()
      const publicKey = new PublicKey(walletAddress)

      // Get all token accounts owned by the wallet
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: TOKEN_PROGRAM_ID,
      })

      console.log(`Found ${tokenAccounts.value.length} token accounts`)

      // Filter for NFTs (amount = 1)
      const nftAccounts = tokenAccounts.value.filter((account) => {
        const amount = account.account.data.parsed.info.tokenAmount.uiAmount
        return amount === 1
      })

      console.log(`Found ${nftAccounts.length} potential NFT accounts`)

      // Get metadata for each NFT
      const nfts = await Promise.all(
        nftAccounts.map(async (account) => {
          try {
            const mint = new PublicKey(account.account.data.parsed.info.mint)

            // Find metadata PDA
            const [metadataPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
              METADATA_PROGRAM_ID,
            )

            // Get metadata account info
            const metadataAccount = await connection.getAccountInfo(metadataPDA)

            if (!metadataAccount) {
              return null
            }

            // Since we can't use the Metadata.deserialize method directly,
            // we'll manually extract the basic metadata from the account data
            try {
              // Basic parsing of metadata account data
              // This is a simplified approach - in a production app you might want to use
              // a proper deserializer for the metadata account data
              const metadata = this.parseMetadataAccount(metadataAccount.data)

              // Fetch additional metadata from URI if available
              let externalMetadata = {}
              let imageUrl = ""

              if (metadata.uri) {
                try {
                  const response = await fetch(metadata.uri)
                  externalMetadata = await response.json()

                  if (externalMetadata && (externalMetadata as any).image) {
                    imageUrl = (externalMetadata as any).image
                    // Convert IPFS URI to HTTP if needed
                    if (imageUrl.startsWith("ipfs://")) {
                      imageUrl = pinataService.ipfsToHttp(imageUrl)
                    }
                  }
                } catch (error) {
                  console.error("Error fetching external metadata:", error)
                }
              }

              return {
                mint: mint.toString(),
                name: metadata.name,
                symbol: metadata.symbol,
                uri: metadata.uri,
                metadata: externalMetadata,
                imageUrl,
              }
            } catch (error) {
              console.error("Error parsing metadata account data:", error)
              return null
            }
          } catch (error) {
            console.error("Error processing NFT account:", error)
            return null
          }
        }),
      )

      // Filter out nulls and format response to match Moralis structure as closely as possible
      const validNfts = nfts.filter(Boolean).map((nft) => ({
        mint: nft.mint,
        name: nft.name,
        symbol: nft.symbol,
        metadata: JSON.stringify(nft.metadata),
        imageUrl: nft.imageUrl,
      }))

      console.log(`Successfully fetched ${validNfts.length} NFTs directly from Solana`)
      return validNfts
    } catch (error) {
      console.error("Error fetching NFTs directly from Solana:", error)
      return []
    }
  }

  /**
   * Parse metadata account data
   * This is a simplified parser for Metaplex metadata
   * @param data The account data buffer
   * @returns Parsed metadata
   */
  private parseMetadataAccount(data: Buffer): { name: string; symbol: string; uri: string } {
    try {
      // Skip the first bytes which contain header information
      // The exact structure depends on the version of the metadata program

      // Find null terminators for strings
      const nameStart = 1 + 32 + 32 + 4 // Approximate position after key, update auth, mint

      // Find the end of the name string (null terminator)
      let nameEnd = nameStart
      while (nameEnd < data.length && data[nameEnd] !== 0) {
        nameEnd++
      }

      // Extract name
      const name = data.slice(nameStart, nameEnd).toString("utf8").replace(/\0/g, "")

      // Symbol starts after name
      const symbolStart = nameEnd + 1
      let symbolEnd = symbolStart
      while (symbolEnd < data.length && data[symbolEnd] !== 0) {
        symbolEnd++
      }

      // Extract symbol
      const symbol = data.slice(symbolStart, symbolEnd).toString("utf8").replace(/\0/g, "")

      // URI starts after symbol
      const uriStart = symbolEnd + 1
      let uriEnd = uriStart
      while (uriEnd < data.length && data[uriEnd] !== 0) {
        uriEnd++
      }

      // Extract URI
      const uri = data.slice(uriStart, uriEnd).toString("utf8").replace(/\0/g, "")

      return { name, symbol, uri }
    } catch (error) {
      console.error("Error parsing metadata account:", error)
      return { name: "Unknown", symbol: "UNKNOWN", uri: "" }
    }
  }
}

// Create and export a singleton instance
const solanaRpcService = new SolanaRpcService()
export default solanaRpcService
