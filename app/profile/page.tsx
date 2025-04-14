"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSolanaWallet } from "@/contexts/solana-wallet-context"
import useCollection from "@/hooks/use-collection"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import LoadingIndicator from "@/components/loading-indicator"
import { AlertCircle, Plus, Wallet, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import pinataService from "@/services/pinata"
import { toast } from "react-hot-toast"

export default function ProfilePage() {
  const router = useRouter()
  const { wallet, userNfts } = useSolanaWallet()
  const { fetchMyCollections, collections, isLoading } = useCollection()
  const [activeTab, setActiveTab] = useState("collections")
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [processedNfts, setProcessedNfts] = useState<any[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      if (wallet.connected) {
        await fetchMyCollections()
        processNfts()
      }
      setIsInitialLoading(false)
    }

    loadData()
  }, [wallet.connected, fetchMyCollections, userNfts])

  // Process NFTs to get metadata and images
  const processNfts = async () => {
    if (!userNfts || userNfts.length === 0) {
      setProcessedNfts([])
      return
    }

    console.log(`Processing ${userNfts.length} NFTs`)

    try {
      const processed = await Promise.all(
        userNfts.map(async (nft: any, index: number) => {
          try {
            // Check if the NFT already has an imageUrl property (from direct RPC)
            if (nft.imageUrl) {
              return {
                ...nft,
                parsedMetadata:
                  typeof nft.metadata === "string" ? JSON.parse(nft.metadata || "{}") : nft.metadata || {},
              }
            }

            // Parse metadata if it's a string
            let metadata = {}
            if (nft.metadata) {
              try {
                metadata = typeof nft.metadata === "string" ? JSON.parse(nft.metadata) : nft.metadata
              } catch (err) {
                console.error(`Error parsing NFT metadata for NFT ${index + 1}:`, err)
              }
            }

            // Get image URL
            let imageUrl = "/placeholder.svg?height=300&width=300"
            if (metadata && (metadata as any).image) {
              imageUrl = pinataService.ipfsToHttp((metadata as any).image)
            }

            return {
              ...nft,
              parsedMetadata: metadata,
              imageUrl,
            }
          } catch (err) {
            console.error(`Error processing NFT ${index + 1}:`, err)
            return {
              ...nft,
              parsedMetadata: {},
              imageUrl: "/placeholder.svg?height=300&width=300",
            }
          }
        }),
      )

      console.log(`Successfully processed ${processed.length} NFTs`)
      setProcessedNfts(processed)
    } catch (error) {
      console.error("Error in batch processing NFTs:", error)
      // Fallback to simple processing
      const simpleProcessed = userNfts.map((nft: any) => ({
        ...nft,
        parsedMetadata: {},
        imageUrl: nft.imageUrl || "/placeholder.svg?height=300&width=300",
      }))
      setProcessedNfts(simpleProcessed)
    }
  }

  // Handle manual refresh
  const handleRefresh = async () => {
    if (!wallet.connected) return

    setIsRefreshing(true)
    try {
      // Clear cache to force fresh fetch
      if (wallet.publicKey) {
        localStorage.removeItem(`nfts_${wallet.publicKey.toString()}`)
        localStorage.removeItem(`nfts_cache_time_${wallet.publicKey.toString()}`)
      }

      // Force reload the page to trigger a fresh fetch
      window.location.reload()
    } catch (error) {
      console.error("Error refreshing NFTs:", error)
      toast.error("Failed to refresh NFTs")
      setIsRefreshing(false)
    }
  }

  if (isInitialLoading || isLoading) {
    return <LoadingIndicator message="Loading your profile..." />
  }

  if (!wallet.connected) {
    return (
      <div className="container py-12">
        <div className="max-w-md mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Wallet not connected</AlertTitle>
            <AlertDescription>Please connect your wallet to view your profile</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
            <p className="text-muted-foreground mt-2">Manage your collections and view your NFTs on Solana</p>
          </div>
          <Button asChild className="bg-primary hover:bg-primary/90">
            <Link href="/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Collection
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border">
          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Connected Wallet</p>
            <p className="font-medium truncate max-w-[200px] md:max-w-md">{wallet.publicKey?.toString()}</p>
          </div>
        </div>

        <Tabs defaultValue="collections" className="w-full" onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-4">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="collections">My Collections</TabsTrigger>
              <TabsTrigger value="nfts">My NFTs</TabsTrigger>
            </TabsList>

            {activeTab === "nfts" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            )}
          </div>

          <TabsContent value="collections" className="mt-6">
            {collections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-primary/10 p-4 mb-4">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">No collections yet</h2>
                <p className="text-muted-foreground mb-6 max-w-md">
                  You haven't created any NFT collections yet. Start by creating your first collection.
                </p>
                <Button asChild className="bg-primary hover:bg-primary/90">
                  <Link href="/create">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Collection
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {collections.map((collection, index) => (
                  <motion.div
                    key={collection.collectionMint}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className="overflow-hidden hover:border-primary/50 transition-all duration-300 h-full flex flex-col">
                      <div className="aspect-square overflow-hidden">
                        <img
                          src={collection.imageUrl || "/placeholder.svg"}
                          alt={collection.name}
                          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                      </div>
                      <CardHeader className="pb-2">
                        <CardTitle>{collection.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="pb-2 flex-grow">
                        <p className="text-muted-foreground line-clamp-2">{collection.description}</p>
                      </CardContent>
                      <CardFooter className="flex justify-between text-sm text-muted-foreground">
                        <div>{collection.mintPrice} SOL</div>
                        <div className="flex gap-2">
                          <span>{collection.mintedNfts?.length || 0}</span>
                          <span>/</span>
                          <span>{collection.maxSupply} items</span>
                        </div>
                      </CardFooter>
                      <div className="p-4 pt-0">
                        <Button asChild variant="outline" className="w-full">
                          <Link href={`/collection/${collection.collectionMint}`}>View Collection</Link>
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="nfts" className="mt-6">
            {processedNfts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-primary/10 p-4 mb-4">
                  <Wallet className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">No NFTs found</h2>
                <p className="text-muted-foreground mb-6 max-w-md">
                  You don't have any NFTs in your wallet yet. Explore collections to find NFTs to mint.
                </p>
                <div className="flex gap-4">
                  <Button asChild className="bg-primary hover:bg-primary/90">
                    <Link href="/explore">Explore Collections</Link>
                  </Button>
                  <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {processedNfts.map((nft, index) => (
                  <motion.div
                    key={nft.mint || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                  >
                    <Card className="overflow-hidden hover:border-primary/50 transition-all duration-300 h-full flex flex-col">
                      <div className="aspect-square overflow-hidden">
                        <img
                          src={nft.imageUrl || "/placeholder.svg"}
                          alt={nft.name || `NFT #${index + 1}`}
                          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-medium truncate">{nft.name || `NFT #${index + 1}`}</h3>
                        <p className="text-sm text-muted-foreground mt-1 truncate">{nft.symbol || "NFT"}</p>

                        {nft.parsedMetadata && (nft.parsedMetadata as any).attributes && (
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            {(nft.parsedMetadata as any).attributes.slice(0, 4).map((attr: any, i: number) => (
                              <div key={i} className="bg-muted rounded-md px-2 py-1 text-xs">
                                <span className="text-muted-foreground">{attr.trait_type}: </span>
                                <span>{attr.value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => window.open(`https://explorer.solana.com/address/${nft.mint}`, "_blank")}
                        >
                          View on Explorer
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  )
}
