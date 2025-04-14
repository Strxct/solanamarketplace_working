"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSolanaWallet } from "@/contexts/solana-wallet-context"
import useCollection from "@/hooks/use-collection"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import LoadingIndicator from "@/components/loading-indicator"
import { AlertCircle, Plus } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function MyCollectionsPage() {
  const router = useRouter()
  const { wallet } = useSolanaWallet()
  const { fetchMyCollections, collections, isLoading } = useCollection()
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  useEffect(() => {
    const loadCollections = async () => {
      if (wallet.connected) {
        await fetchMyCollections()
      }
      setIsInitialLoading(false)
    }

    loadCollections()
  }, [wallet.connected, fetchMyCollections])

  if (isInitialLoading || isLoading) {
    return <LoadingIndicator message="Loading your collections..." />
  }

  if (!wallet.connected) {
    return (
      <div className="container py-12">
        <div className="max-w-md mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Wallet not connected</AlertTitle>
            <AlertDescription>Please connect your wallet to view your collections</AlertDescription>
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Collections</h1>
            <p className="text-muted-foreground mt-2">Manage your created NFT collections</p>
          </div>
          <Button asChild className="bg-primary hover:bg-primary/90">
            <Link href="/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Collection
            </Link>
          </Button>
        </div>

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
                      <span>{collection.nftMetadataUris?.length || 0}</span>
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
      </motion.div>
    </div>
  )
}
