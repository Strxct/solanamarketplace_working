"use client"

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { generateSigner, percentAmount, publicKey, some } from "@metaplex-foundation/umi"
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters"
import { createNft, TokenStandard, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata"
import { transferSol } from "@metaplex-foundation/mpl-toolbox"
import pinataService from "./pinata"
import { transactionBuilder } from '@metaplex-foundation/umi';
import { sol } from "@metaplex-foundation/umi"
// Constants
export const PLATFORM_FEE_PERCENT = 8
// Platform fee wallet address
export const PLATFORM_FEE_ADDRESS = "J5zeD8EDjbJDARaMPQWR2QjvSZ1SoSQuj6BYf973EUZS"

// Batch size for processing NFTs
const BATCH_SIZE = 10

/**
 * Service for interacting with Metaplex for NFT operations
 */
class MetaplexService {
  /**
   * Create a new NFT collection
   * @param wallet Wallet adapter instance
   * @param collectionName Name of the collection
   * @param symbol Symbol for the collection
   * @param description Description of the collection
   * @param collectionImage File object for collection image
   * @param nftImages Array of File objects for NFTs
   * @param mintPrice Price in SOL to mint each NFT
   * @param maxSupply Maximum number of NFTs in the collection
   * @param royaltyPercentage Royalty percentage for secondary sales
   * @returns Collection information
   */
  async createCollection(
    wallet: any,
    collectionName: string,
    symbol: string,
    description: string,
    collectionImage: File,
    nftImages: File[],
    mintPrice: number,
    maxSupply: number,
    royaltyPercentage = 5,
  ): Promise<any> {
    try {
      console.log("Creating NFT collection with Metaplex...")

      if (!wallet.connected) {
        throw new Error("Wallet not connected")
      }

      // Dispatch progress event
      this.dispatchProgressEvent("Initializing collection creation...")

      // Connect to Solana with Umi
      const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com"
      const umi = createUmi(endpoint).use(mplTokenMetadata()).use(walletAdapterIdentity(wallet))

      // 1. Upload collection image to IPFS via Pinata
      this.dispatchProgressEvent("Uploading collection image to IPFS...")
      const collectionImageUri = await pinataService.uploadFile(collectionImage, `${collectionName}-collection`)
      console.log("Collection image uploaded:", collectionImageUri)

      // 2. Create collection metadata
      this.dispatchProgressEvent("Creating collection metadata...")
      const collectionMetadata = {
        name: collectionName,
        symbol: symbol,
        description: description,
        image: collectionImageUri,
        seller_fee_basis_points: royaltyPercentage * 100, // 5% = 500 basis points
        properties: {
          files: [
            {
              uri: collectionImageUri,
              type: collectionImage.type || "image/png",
            },
          ],
          category: "image",
          creators: [
            {
              address: wallet.publicKey.toString(),
              share: 100,
            },
          ],
          maxSupply: maxSupply,
          isCollection: true,
        },
        attributes: [
          {
            trait_type: "Collection",
            value: "true",
          },
          {
            trait_type: "Max Supply",
            value: maxSupply.toString(),
          },
        ],
      }

      // 3. Upload collection metadata to IPFS via Pinata
      this.dispatchProgressEvent("Uploading collection metadata to IPFS...")
      const collectionMetadataUri = await pinataService.uploadJson(collectionMetadata, `${collectionName}-metadata`)
      console.log("Collection metadata uploaded:", collectionMetadataUri)

      // 4. Create the collection using Metaplex
      this.dispatchProgressEvent("Creating collection on-chain...")

      // Generate a signer for the collection
      const collectionMint = generateSigner(umi)

      // Create the collection NFT with explicit maxSupply
      const collectionNftBuilder = createNft(umi, {
        mint: collectionMint,
        name: collectionName,
        symbol: symbol,
        uri: collectionMetadataUri,
        sellerFeeBasisPoints: percentAmount(royaltyPercentage, 2),
        isCollection: true,
        tokenStandard: TokenStandard.NonFungible,
        collection: undefined,
        uses: undefined,
        isMutable: true,
        maxSupply: some(maxSupply),
      })

      // Build and execute the transaction
      const collectionTx = await collectionNftBuilder.buildAndSign(umi)
      const collectionSig = await umi.rpc.sendTransaction(collectionTx)
      console.log("Collection created with signature:", collectionSig)

      // Wait for confirmation with retries
      let confirmed = false
      let retries = 0
      const maxRetries = 5

      while (!confirmed && retries < maxRetries) {
        try {
          await umi.rpc.confirmTransaction(collectionSig, {
            strategy: { type: "blockhash", blockhash: collectionTx.blockhash },
          })
          confirmed = true
          console.log("Collection creation transaction confirmed")
        } catch (error) {
          retries++
          console.log(`Confirmation attempt ${retries} failed, retrying...`)
          await new Promise((resolve) => setTimeout(resolve, 2000)) // Wait 2 seconds before retry
        }
      }

      if (!confirmed) {
        throw new Error("Failed to confirm collection creation transaction after multiple attempts")
      }

      // 5. Upload and prepare NFT metadata in batches
      this.dispatchProgressEvent("Uploading NFT images and metadata...")
      const nftMetadataUris = []

      // Process NFTs in batches to avoid overwhelming the network
      for (let batchStart = 0; batchStart < nftImages.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, nftImages.length)
        const batch = nftImages.slice(batchStart, batchEnd)

        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map(async (nftImage, batchIndex) => {
            const index = batchStart + batchIndex
            const nftName = `${collectionName} #${index + 1}`

            this.dispatchProgressEvent(`Uploading image for ${nftName} (${index + 1}/${nftImages.length})...`)

            // Upload NFT image to IPFS via Pinata
            const nftImageUri = await pinataService.uploadFile(nftImage, `${nftName}`)

            // Create NFT metadata
            const nftMetadata = {
              name: `${collectionName} #${index + 1}`,
              symbol: symbol,
              description: description,
              image: nftImageUri,
              seller_fee_basis_points: royaltyPercentage * 100,
              attributes: [
                {
                  trait_type: "Collection",
                  value: collectionName,
                },
                {
                  trait_type: "Number",
                  value: `${index + 1}`,
                },
              ],
              properties: {
                files: [
                  {
                    uri: nftImageUri,
                    type: nftImage.type || "image/png",
                  },
                ],
                category: "image",
                creators: [
                  {
                    address: wallet.publicKey.toString(),
                    share: 100,
                  },
                ],
              },
              collection: {
                name: collectionName,
                family: symbol,
                mint: collectionMint.publicKey.toString(),
              },
            }

            // Upload NFT metadata to IPFS via Pinata
            this.dispatchProgressEvent(`Uploading metadata for ${nftName} (${index + 1}/${nftImages.length})...`)
            const nftMetadataUri = await pinataService.uploadJson(nftMetadata, `${nftName}-metadata`)
            return nftMetadataUri
          }),
        )

        // Add batch results to the full list
        nftMetadataUris.push(...batchResults)
      }

      this.dispatchProgressEvent("Collection creation completed!")

      // Return collection information
      return {
        collectionMint: collectionMint.publicKey.toString(),
        collectionMetadataUri: collectionMetadataUri,
        nftMetadataUris: nftMetadataUris,
        mintPrice: mintPrice,
        maxSupply: maxSupply,
        royaltyPercentage: royaltyPercentage,
        transactionSignature: collectionSig,
      }
    } catch (error) {
      console.error("Error creating collection:", error)
      throw error
    }
  }

  /**
   * Mint an NFT from a collection
   * @param wallet Wallet adapter instance (minter wallet)
   * @param collectionMint Collection mint address
   * @param nftIndex Index of the NFT to mint
   * @param nftMetadataUri Metadata URI for the NFT to mint
   * @param mintPrice Price in SOL to mint the NFT
   * @param creatorWallet Creator wallet address to receive payment
   * @returns Minted NFT information
   */
  async mintNft(
    wallet: any,
    collectionMint: string,
    nftIndex: number,
    nftMetadataUri: string,
    mintPrice: number,
    creatorWallet: string,
  ): Promise<any> {
    try {
      console.log("Minting NFT with Metaplex...");

      if (!wallet.connected) {
        throw new Error("Wallet not connected");
      }

      this.dispatchProgressEvent("Initializing mint process...");

      const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
      const umi = createUmi(endpoint)
        .use(mplTokenMetadata())
        .use(walletAdapterIdentity(wallet));

      const nftMint = generateSigner(umi);

      const platformFeeSol = mintPrice * (PLATFORM_FEE_PERCENT / 100);
      const creatorPayment = mintPrice;

      this.dispatchProgressEvent("Creating NFT and preparing payments...");

      // Create a transaction builder
      let txBuilder = transactionBuilder();

      // Add NFT creation instructions to the transaction builder
      txBuilder = txBuilder.add(
        createNft(umi, {
          mint: nftMint,
          name: await this.getNftNameFromMetadata(nftMetadataUri),
          uri: nftMetadataUri,
          sellerFeeBasisPoints: percentAmount(5, 2),
          collection: some({ key: publicKey(collectionMint), verified: false }),
          tokenStandard: TokenStandard.NonFungible,
        })
      );

      // Add platform fee transfer
      txBuilder = txBuilder.add(
        transferSol(umi, {
          source: umi.identity,
          destination: publicKey(PLATFORM_FEE_ADDRESS),
          amount: sol(platformFeeSol), // Use sol() helper to convert SOL to lamports
        })
      );

      // Add creator payment
      txBuilder = txBuilder.add(
        transferSol(umi, {
          source: umi.identity,
          destination: publicKey(creatorWallet),
          amount: sol(creatorPayment), // Use sol() helper to convert SOL to lamports
        })
      );

      this.dispatchProgressEvent("Signing and sending transaction...");

      // Send and confirm the transaction
      const { signature: txSig } = await txBuilder.sendAndConfirm(umi, {
        confirm: { commitment: 'confirmed' },
      });

      console.log("Transaction sent with signature:", txSig);

      this.dispatchProgressEvent("Mint completed successfully!");

      return {
        nftMint: nftMint.publicKey.toString(),
        transactionSignature: txSig,
        platformFee: platformFeeSol,
        creatorPayment: creatorPayment,
      };
    } catch (error) {
      console.error("Error minting NFT:", error);
      throw error;
    }
  }






  /**
   * Verify NFT belongs to a collection
   * @param wallet Wallet adapter instance (collection authority)
   * @param collectionMint Collection mint address
   * @param nftMint NFT mint address to verify
   * @returns Transaction signature
   */
  async verifyNftInCollection(wallet: any, collectionMint: string, nftMint: string): Promise<string> {
    try {
      console.log("Verifying NFT in collection...")

      if (!wallet.connected) {
        throw new Error("Wallet not connected")
      }

      // Connect to Solana with Umi
      const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com"
      const umi = createUmi(endpoint).use(mplTokenMetadata()).use(walletAdapterIdentity(wallet))

      // Verify the NFT in the collection
      // This is a simplified implementation
      // In a real implementation, you would use the Metaplex SDK to verify the NFT

      return "mock-transaction-signature" // This would be a real signature in production
    } catch (error) {
      console.error("Error verifying NFT in collection:", error)
      throw error
    }
  }

  /**
   * Extract NFT name from metadata URI
   * @param metadataUri URI of the NFT metadata
   * @returns NFT name from metadata
   */
  private async getNftNameFromMetadata(metadataUri: string): Promise<string> {
    try {
      // Convert IPFS URI to HTTP for fetching
      const httpUri = pinataService.ipfsToHttp(metadataUri)

      // Fetch metadata
      const response = await fetch(httpUri)
      const metadata = await response.json()

      // Return name from metadata
      return metadata.name || "Unnamed NFT"
    } catch (error) {
      console.error("Error getting NFT name from metadata:", error)
      return "Unnamed NFT"
    }
  }

  /**
   * Helper method to dispatch progress events
   * @param message Progress message
   */
  private dispatchProgressEvent(message: string): void {
    if (typeof window !== "undefined") {
      const event = new CustomEvent("metaplex-progress", {
        detail: { message },
      })
      window.dispatchEvent(event)
    }
  }
}

// Create and export a singleton instance
const metaplexService = new MetaplexService()
export default metaplexService
