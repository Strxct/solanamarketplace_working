"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Share2, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import LoadingIndicator from "@/components/loading-indicator"
import { useSolanaWallet } from "@/contexts/solana-wallet-context"
import useCollection from "@/hooks/use-collection"
import MintForm from "@/components/mint-form"
import pinataService from "@/services/pinata"
import collectionStorageService from "@/services/collection-storage"
import { toast } from "react-hot-toast"

export default function CollectionPage({ params }: { params: { id: string } }) {
  const { wallet } = useSolanaWallet()
  const { fetchCollectionByMint, currentCollection, isLoading } = useCollection()
  const [activeTab, setActiveTab] = useState("items")
  const [collection, setCollection] = useState<any>(null)
  const [nfts, setNfts] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [isLoadingNfts, setIsLoadingNfts] = useState(false)
  const [collectionMetadata, setCollectionMetadata] = useState<any>(null)

  const loadNftData = useCallback(async (metadataUris: string[]) => {
    try {
      setIsLoadingNfts(true)

      // Process in smaller batches to prevent UI freezing
      const batchSize = 5
      const results = []

      for (let i = 0; i < metadataUris.length; i += batchSize) {
        const batch = metadataUris.slice(i, i + batchSize)

        // Process batch
        const batchResults = await Promise.all(
          batch.map(async (uri: string, batchIndex: number) => {
            const index = i + batchIndex
            try {
              // Convert IPFS URI to HTTP for fetching
              const httpUri = pinataService.ipfsToHttp(uri)

              // Fetch metadata
              const response = await fetch(httpUri)
              const metadata = await response.json()

              return {
                id: `item-${index + 1}`,
                name: metadata.name || `NFT #${index + 1}`,
                image: pinataService.ipfsToHttp(metadata.image) || `/placeholder.svg?height=300&width=300`,
                attributes: metadata.attributes || [],
              }
            } catch (err) {
              console.error(`Error fetching NFT metadata for ${uri}:`, err)
              return {
                id: `item-${index + 1}`,
                name: `NFT #${index + 1}`,
                image: `/placeholder.svg?height=300&width=300`,
                attributes: [],
              }
            }
          }),
        )

        results.push(...batchResults)

        // Update state incrementally to show progress
        setNfts((prev) => [...prev, ...batchResults])

        // Small delay to allow UI to update
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      // Final update with all results
      setNfts(results)
    } catch (error) {
      console.error("Error loading NFT data:", error)
    } finally {
      setIsLoadingNfts(false)
    }
  }, [])

  useEffect(() => {
    const fetchCollectionMetadata = async () => {
      if (!collection?.collectionMetadataUri) return

      try {
        const httpUri = pinataService.ipfsToHttp(collection.collectionMetadataUri)
        const response = await fetch(httpUri)
        const metadata = await response.json()
        setCollectionMetadata(metadata)
      } catch (err) {
        console.error("Error fetching collection metadata:", err)
      }
    }

    fetchCollectionMetadata()
  }, [collection?.collectionMetadataUri])

  useEffect(() => {
    const loadCollection = async () => {
      try {
        // Fetch collection from backend
        const response = await fetch("https://cyberwebsec.com/45.136.141.140:3031/nft/single", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({ collectionMint: params.id })// Assuming backend needs the mint ID
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch collection: ${response.statusText}`);
        }
        const data = await response.json();
        const collectionData = data.collection;

        if (collectionData) {
          setCollection(collectionData);
          setNfts([]); // Reset NFTs before loading new ones

          // Load NFT metadata if present
          if (collectionData.nftMetadataUris?.length > 0) {
            loadNftData(collectionData.nftMetadataUris);
          }

          // Generate activity data
          generateActivityData(collectionData);
        }

        // Optionally fetch fresh data from chain
        fetchCollectionByMint(params.id)
          .then((freshData) => {
            if (freshData) {
              setCollection(freshData);

              const shouldReloadNfts =
                !collectionData.nftMetadataUris ||
                JSON.stringify(collectionData.nftMetadataUris) !== JSON.stringify(freshData.nftMetadataUris);

              if (shouldReloadNfts && freshData.nftMetadataUris?.length > 0) {
                setNfts([]);
                loadNftData(freshData.nftMetadataUris);
              }

              generateActivityData(freshData);
            }
          })
          .catch((error) => {
            console.error("Error loading fresh collection data:", error);
            toast.error(error.message || "Failed to load updated collection");
          });
      } catch (error: any) {
        console.error("Error loading collection:", error);
        toast.error(error.message || "Failed to load collection");
      }
    };

    const generateActivityData = (collectionData: any) => {
      if (!collectionData || !collectionData.name) return;

      const mintedActivities = (collectionData.mintedNfts || []).map((mint: any, i: number) => ({
        id: `activity-mint-${i}`,
        type: "Mint",
        item: `${collectionData.name} #${mint.nftIndex + 1}`,
        from: "Creator",
        to: wallet.publicKey?.toString() || "Collector",
        price: collectionData.mintPrice,
        time: mint.mintedAt || new Date().toISOString(),
      }));

      const mockActivities = Array(Math.max(0, 5 - mintedActivities.length))
        .fill(null)
        .map((_, i) => ({
          id: `activity-${i + 1}`,
          type: ["Sale", "Transfer", "List", "Offer"][i % 4],
          item: `${collectionData.name} #${i + 1}`,
          from: i === 0 ? "Creator" : `User${i}`,
          to: `User${i + 1}`,
          price: collectionData.mintPrice + i * 0.2,
          time: new Date(Date.now() - i * 86400000).toISOString(),
        }));

      const allActivities = [...mintedActivities, ...mockActivities].sort(
        (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
      );

      setActivity(allActivities);
    };

    if (params.id) {
      loadCollection();
    }
  }, [params.id, fetchCollectionByMint, loadNftData, wallet.publicKey]);

  const handleMintSuccess = async (nftInfo: any) => {
    console.log("Minted NFT:", nftInfo)

    const newMint = {
      nftMint: nftInfo.nftMint,
      nftIndex: nftInfo.nftIndex,
      nftMetadataUri: nftInfo.nftMetadataUri,
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
          collectionMint: collection.collectionMint, // ✅ just the string value
          mintedNfts: [newMint],
        }),
      })
    } catch (backendErr) {
      console.error("Failed to update backend with new mint:", backendErr)
    }



    // If we have the updated collection from the mint process, use it
    if (nftInfo.updatedCollection) {
      setCollection(nftInfo.updatedCollection)

      // If the collection has NFT metadata URIs, reload NFT data
      if (nftInfo.updatedCollection.nftMetadataUris && nftInfo.updatedCollection.nftMetadataUris.length > 0) {
        loadNftData(nftInfo.updatedCollection.nftMetadataUris)
      }

      // Add the newly minted NFT to the activity
      const newActivity = {
        id: `activity-mint-${Date.now()}`,
        type: "Mint",
        item: `${collection.name} #${nftInfo.nftIndex + 1}`,
        from: "Creator",
        to: wallet.publicKey?.toString() || "Collector",
        price: collection.mintPrice,
        time: new Date().toISOString(),
      }

      setActivity([newActivity, ...activity])
    } else {
      // Otherwise, refresh the collection data from chain
      fetchCollectionByMint(params.id)
    }
  }

  if (isLoading && !collection) {
    return <LoadingIndicator message="Loading collection..." />
  }

  if (!collection) {
    return (
      <div className="container py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Collection not found</h1>
        <p className="text-muted-foreground mb-6">
          The collection you're looking for doesn't exist or has been removed.
        </p>
        <Button asChild>
          <Link href="/explore">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Explore
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Link href="/explore" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Explore
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="sticky top-24"
            >
              <div className="rounded-xl overflow-hidden border border-border mb-6">
              <img
              src={collectionMetadata?.image ? pinataService.ipfsToHttp(collectionMetadata.image) : "/placeholder.svg"}
              alt={collection.name}
              className="w-full aspect-square object-cover"
            />
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <Badge variant="outline" className="px-3 py-1 text-xs">
                    {collection.symbol}
                  </Badge>
                  <Button variant="ghost" size="icon" title="Share collection">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-sm">Price</span>
                    <span className="font-medium">{collection.mintPrice} SOL</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-sm">Minted</span>
                    <span className="font-medium">
                      {collection.mintedNfts?.length || 0} / {collection.maxSupply}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-sm">Royalty</span>
                    <span className="font-medium">{collection.royaltyPercentage}%</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-sm">Creator</span>
                    <span className="font-medium truncate">{collection.creatorAddress}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span>Verified Collection</span>
                </div>

                <MintForm collection={collection} onMintSuccess={handleMintSuccess} />
              </div>
            </motion.div>
          </div>

          <div className="md:col-span-2">
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-3xl font-bold">{collection.name}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-muted-foreground">By {collection.creatorAddress}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title="View on Explorer"
                    onClick={() =>
                      window.open(`https://explorer.solana.com/address/${collection.collectionMint}`, "_blank")
                    }
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-4 text-muted-foreground">{collection.description}</p>
              </div>

              <Tabs defaultValue="items" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-1">
                  <TabsTrigger value="items">Items</TabsTrigger>
                  {/* <TabsTrigger value="activity">Activity</TabsTrigger> */}
                </TabsList>
                <TabsContent value="items" className="mt-6">
                  {isLoadingNfts ? (
                    <div className="py-8">
                      <LoadingIndicator message="Loading NFT items..." />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {nfts.length === 0 ? (
                        <div className="col-span-full text-center py-12">
                          <p className="text-muted-foreground">No items to display yet.</p>
                        </div>
                      ) : (
                        nfts.map((item: any, index: number) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                          >
                            <Card className="overflow-hidden hover:border-primary/50 transition-all duration-300">
                              <div className="aspect-square overflow-hidden">
                                <img
                                  src={item.image || "/placeholder.svg"}
                                  alt={item.name}
                                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                                />
                              </div>
                              <CardContent className="p-4">
                                <h3 className="font-medium">{item.name}</h3>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                  {item.attributes.slice(0, 4).map((attr: any, i: number) => (
                                    <div key={i} className="bg-muted rounded-md px-2 py-1 text-xs">
                                      <span className="text-muted-foreground">{attr.trait_type}: </span>
                                      <span>{attr.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))
                      )}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="activity" className="mt-6">
                  <div className="rounded-lg border">
                    <div className="grid grid-cols-5 gap-4 p-4 border-b text-sm font-medium">
                      <div>Event</div>
                      <div>Item</div>
                      <div>From</div>
                      <div>To</div>
                      <div>Price</div>
                    </div>
                    <div className="divide-y">
                      {activity.length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-muted-foreground">No activity to display yet.</p>
                        </div>
                      ) : (
                        activity.map((activity: any) => (
                          <div key={activity.id} className="grid grid-cols-5 gap-4 p-4 text-sm">
                            <div>
                              <Badge
                                variant={activity.type === "Mint" ? "default" : "secondary"}
                                className="px-2 py-0.5"
                              >
                                {activity.type}
                              </Badge>
                            </div>
                            <div className="truncate">{activity.item}</div>
                            <div className="truncate">{activity.from}</div>
                            <div className="truncate">{activity.to}</div>
                            <div>{activity.price} SOL</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
