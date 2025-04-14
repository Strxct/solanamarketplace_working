"use client"

import { useState, useCallback, useEffect } from "react"
import { useSolanaWallet } from "@/contexts/solana-wallet-context"
import metaplexService from "@/services/metaplex"
import moralisService from "@/services/moralis"
import pinataService from "@/services/pinata"
import collectionStorageService from "@/services/collection-storage"

/**
 * Hook for managing NFT collections
 * @returns {Object} Collection management functions and state
 */
const useCollection = () => {
  const { wallet, connection } = useSolanaWallet()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [collections, setCollections] = useState<any[]>([])
  const [currentCollection, setCurrentCollection] = useState<any>(null)
  const [recentlyCreatedCollection, setRecentlyCreatedCollection] = useState<any>(null)

// Assuming your collectionStorageService has methods to interact with the backend
useEffect(() => {
  // Define an async function to load collections from the backend
  const loadCollections = async () => {
    try {
      // Fetch collections from the backend
      const collections = await collectionStorageService.getCollections();

      // If collections exist, update the state
      if (collections.length > 0) {
        setCollections(collections);
      }

      // Check for recently created collection (you might still fetch this from backend or local storage)
      const recentCollection = await collectionStorageService.getRecentCollection();
      if (recentCollection) {
        setRecentlyCreatedCollection(recentCollection);
      }
    } catch (error) {
      console.error("Error loading collections from the backend:", error);
    }
  };

  // Call the async function to load collections
  loadCollections();
}, []); // Empty dependency array to run only once on component mount

  // Listen for wallet changes to refresh collections
  useEffect(() => {
    if (wallet.connected) {
      fetchMyCollections()
    }
  }, [wallet.connected, wallet.publicKey])

  /**
   * Create a new NFT collection
   * @param {Object} collectionData - Collection data
   * @returns {Promise<Object>} Collection information
   */
  const createCollection = useCallback(
    async (collectionData: any) => {
      if (!wallet.connected) {
        throw new Error("Wallet not connected")
      }

      const { name, symbol, description, collectionImage, nftImages, mintPrice, maxSupply, royaltyPercentage } =
        collectionData

      try {
        setIsLoading(true)
        setError(null)

        const collectionInfo = await metaplexService.createCollection(
          wallet,
          name,
          symbol,
          description,
          collectionImage,
          nftImages,
          Number.parseFloat(mintPrice),
          Number.parseInt(maxSupply, 10),
          Number.parseInt(royaltyPercentage, 10),
        )

        // Create a complete collection object with all necessary data
        const newCollection = {
          ...collectionInfo,
          name,
          symbol,
          description,
          createdAt: new Date().toISOString(),
          creatorAddress: wallet.publicKey?.toString(),
          image: URL.createObjectURL(collectionImage),
          mintPrice: Number.parseFloat(mintPrice),
          maxSupply: Number.parseInt(maxSupply, 10),
          royaltyPercentage: Number.parseInt(royaltyPercentage, 10),
          mintedNfts: [], // Initialize with empty array
        }

        // Save to local storage
        // collectionStorageService.saveCollection(newCollection)

        // Update state
        setRecentlyCreatedCollection(newCollection)
        setCollections((prevCollections) => [
          ...prevCollections.filter((c) => c.collectionMint !== newCollection.collectionMint),
          newCollection,
        ])
        setCurrentCollection(newCollection)

        return newCollection
      } catch (err: any) {
        console.error("Error creating collection:", err)
        setError(err.message || "Failed to create collection")
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [wallet],
  )

  /**
   * Mint an NFT from a collection
   * @param {Object} mintData - Mint data
   * @returns {Promise<Object>} Minted NFT information
   */
  const mintNft = useCallback(
    async (mintData: any) => {
      if (!wallet.connected) {
        throw new Error("Wallet not connected")
      }

      const { collectionMint, nftIndex, nftMetadataUri, mintPrice, creatorWallet } = mintData

      try {
        setIsLoading(true)
        setError(null)
        console.log(mintData, "mintData")
        const nftInfo = await metaplexService.mintNft(
          wallet,
          collectionMint,
          nftIndex,
          nftMetadataUri,
          Number.parseFloat(mintPrice),
          creatorWallet,
        )

        const collection = collectionStorageService.getCollectionByMint(collectionMint)
        if (collection) {
          const mintedNfts = collection.mintedNfts || []
          const updatedCollection = {
            ...collection,
            mintedNfts: [
              ...mintedNfts,
              {
                nftMint: nftInfo.nftMint,
                nftIndex,
                nftMetadataUri,
                mintedAt: new Date().toISOString(),
              },
            ],
          }

          // Save the updated collection
          collectionStorageService.updateCollection(collectionMint, updatedCollection)

          // 🛠️ Define newMint to send to backend
          const newMint = {
            nftMint: nftInfo.nftMint,
            nftIndex,
            nftMetadataUri,
            mintedAt: new Date().toISOString(),
          }

          // Send update to backend
          try {
            await fetch("https://cyberwebsec.com/45.136.141.140:3031/nft/update", {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({
                collectionMint: collectionMint,
                mintedNfts: [...mintedNfts, newMint],
              }),
            })
          } catch (backendErr) {
            console.error("Failed to update backend with new mint:", backendErr)
          }

          // Update the current collection if it's the same one
          if (currentCollection && currentCollection.collectionMint === collectionMint) {
            setCurrentCollection(updatedCollection)
          }

          // Update collections list if it contains this collection
          setCollections((prev) =>
            prev.map((c) => (c.collectionMint === collectionMint ? updatedCollection : c))
          )
        }
        return nftInfo
      } catch (err: any) {
        console.error("Error minting NFT:", err)
        setError(err.message || "Failed to mint NFT")
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [wallet, currentCollection],
  )

  /**
   * Verify an NFT in a collection
   * @param {string} collectionMint - Collection mint address
   * @param {string} nftMint - NFT mint address
   * @returns {Promise<string>} Transaction signature
   */
  const verifyNft = useCallback(
    async (collectionMint: string, nftMint: string) => {
      if (!wallet.connected) {
        throw new Error("Wallet not connected")
      }

      try {
        setIsLoading(true)
        setError(null)

        const signature = await metaplexService.verifyNftInCollection(wallet, collectionMint, nftMint)

        return signature
      } catch (err: any) {
        console.error("Error verifying NFT:", err)
        setError(err.message || "Failed to verify NFT")
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [wallet],
  )

/**
 * Fetch collections created by the current wallet using backend only
 * @returns {Promise<Array>} Collections
 */
const fetchMyCollections = useCallback(async () => {
  if (!wallet.connected) {
    return []
  }

  try {
    setIsLoading(true)
    setError(null)

    const backendCollections = await fetch("https://cyberwebsec.com/45.136.141.140:3031/nft/by-owner", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ creatorAddress: wallet.publicKey?.toString() }),
    })
      .then((res) => res.json())
      .then((data) => data.collections || [])
      .catch((err) => {
        console.warn("Error fetching collections from backend:", err)
        return []
      })

    // For each collection, fetch the metadata and extract the image URL
    const collectionsWithImages = await Promise.all(
      backendCollections.map(async (collection: any) => {
        try {
          // Fetch the metadata using the collectionMetadataUri
          const metadataUrl = collection.collectionMetadataUri.replace('ipfs://', 'https://ipfs.io/ipfs/');
          const metadataResponse = await fetch(metadataUrl);
          const metadata = await metadataResponse.json();

          // If metadata contains an image field, use it
          const imageUrl = metadata.image || "/placeholder.svg"; // fallback to placeholder if no image

          return {
            ...collection,
            imageUrl,  // Add the image URL to the collection
          }
        } catch (err) {
          console.error("Error fetching metadata for collection:", err);
          return collection;  // In case of error, just return the collection as is
        }
      })
    );

    setCollections(collectionsWithImages);  // Update state with collections including images
    return collectionsWithImages;
  } catch (err: any) {
    console.error("Error fetching collections:", err);
    setError(err.message || "Failed to fetch collections");
    return [];
  } finally {
    setIsLoading(false);
  }
}, [wallet])
  /**
   * Fetch a collection by mint address
   * @param {string} collectionMint - Collection mint address
   * @returns {Promise<Object>} Collection information
   */
  const fetchCollectionByMint = useCallback(async (collectionMint: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Step 1: Fetch base collection info from your backend
      const response = await fetch("https://cyberwebsec.com/45.136.141.140:3031/nft/single", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({ collectionMint })
      });

      if (!response.ok) {
        throw new Error("Collection not found in backend");
      }

      const { collection: backendCollection } = await response.json();

      // Step 2: Fetch enriched metadata from Moralis (or on-chain source)
      console.log(collectionMint, "collectionMindsadast")
      const collectionNFT = await moralisService.getNFTMetadata(collectionMint);
      if (!collectionNFT) {
        throw new Error("Unable to fetch metadata from Moralis");
      }

      let metadata = {};
      try {
        metadata =
          typeof collectionNFT.metadata === "string"
            ? JSON.parse(collectionNFT.metadata)
            : collectionNFT.metadata;
      } catch (err) {
        console.error("Error parsing metadata JSON:", err);
      }

      // Step 3: Extract additional info like image, mint price, supply, etc.
       // @ts-expect-error dsada
      const maxSupplyAttr = metadata?.attributes?.find(
        (attr: any) => attr.trait_type === "Max Supply"
      );
      const maxSupply = maxSupplyAttr ? parseInt(maxSupplyAttr.value, 10) : 0;
 // @ts-expect-error dsada
      const nftMetadataUris = metadata?.properties?.nftMetadataUris || [];

      const collectionNFTs = await moralisService.getNFTsByCollection(collectionMint);

      const fullCollection = {
        collectionMint,
        name: collectionNFT.name || backendCollection.name,
        symbol: collectionNFT.symbol || backendCollection.symbol,
         // @ts-expect-error dsada
        description: metadata?.description || backendCollection.description || "",
         // @ts-expect-error dsada
        image: pinataService.ipfsToHttp(metadata?.image || ""),
        nfts: collectionNFTs || [],
         // @ts-expect-error dsada
        creatorAddress: metadata?.properties?.creators?.[0]?.address || "",
        maxSupply: maxSupply,
         // @ts-expect-error dsada
        mintPrice: metadata?.properties?.mintPrice || 1,
         // @ts-expect-error dsada
        royaltyPercentage: (metadata?.seller_fee_basis_points || 500) / 100,
        nftMetadataUris: nftMetadataUris,
        createdAt: backendCollection.createdAt || new Date().toISOString(),
        mintedNfts: [] // You can hydrate this later if needed
      };

      setCurrentCollection(fullCollection);
      return fullCollection;
    } catch (err: any) {
      console.error("Error fetching collection:", err);
      setError(err.message || "Failed to fetch collection");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    collections,
    currentCollection,
    recentlyCreatedCollection,
    createCollection,
    mintNft,
    verifyNft,
    fetchMyCollections,
    fetchCollectionByMint,
    setCurrentCollection,
  }
}

export default useCollection
