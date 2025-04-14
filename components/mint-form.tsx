"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { toast } from "react-hot-toast"
import { useSolanaWallet } from "@/contexts/solana-wallet-context"
import useCollection from "@/hooks/use-collection"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import LoadingIndicator from "@/components/loading-indicator"
import { ExternalLink } from "lucide-react"
import pinataService from "@/services/pinata"
import { Progress } from "@/components/ui/progress"
import collectionStorageService from "@/services/collection-storage"

interface MintFormProps {
  collection: any
  onMintSuccess?: (nftInfo: any) => void
}

const MintForm: React.FC<MintFormProps> = ({ collection, onMintSuccess }) => {
  const { wallet, balance } = useSolanaWallet()
  const { mintNft, isLoading } = useCollection()
  const [selectedNft, setSelectedNft] = useState(0)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [mintedNft, setMintedNft] = useState<any>(null)
  const [nftImageUrl, setNftImageUrl] = useState<string>("")
  const [mintProgress, setMintProgress] = useState<number>(0)
  const [mintStep, setMintStep] = useState<string>("")

  // Check if user can afford to mint
  const canAffordMint = balance >= collection.mintPrice

  // Get available NFTs to mint
  const availableNfts = collection?.nftMetadataUris || []

  // Get next available NFT index
  useEffect(() => {
    // In a real implementation, you would query which NFTs have already been minted
    // For now, we'll just use the first one
    setSelectedNft(0)
  }, [collection])

  // Get NFT image URL from metadata URI
  useEffect(() => {
    const getNftImageUrl = async () => {
      if (availableNfts.length > 0 && selectedNft < availableNfts.length) {
        try {
          // Convert IPFS URI to HTTP for fetching
          const httpUri = pinataService.ipfsToHttp(availableNfts[selectedNft])

          // Fetch metadata
          const response = await fetch(httpUri)
          const metadata = await response.json()

          // Set image URL
          setNftImageUrl(pinataService.ipfsToHttp(metadata.image))
        } catch (err) {
          console.error("Error fetching NFT image:", err)
          setNftImageUrl("")
        }
      }
    }

    getNftImageUrl()
  }, [availableNfts, selectedNft])

  // Handle mint button click
  const handleMint = async () => {
    if (!wallet.connected) {
      toast.error("Please connect your wallet first")
      return
    }

    if (!canAffordMint) {
      toast.error(`Insufficient balance. You need at least ${collection.mintPrice} SOL`)
      return
    }

    if (selectedNft === null || selectedNft >= availableNfts.length) {
      toast.error("No NFTs available to mint")
      return
    }

    setIsPurchasing(true)
    setMintProgress(0)
    setMintStep("Preparing mint transaction...")

    try {
      // Update progress
      const updateProgress = (step: string, progress: number) => {
        setMintStep(step)
        setMintProgress(progress)
      }

      // Prepare mint data
      const mintData = {
        collectionMint: collection.collectionMint,
        nftIndex: selectedNft,
        nftMetadataUri: availableNfts[selectedNft],
        mintPrice: collection.mintPrice,
        creatorWallet: collection.creatorAddress,
      }

      // Mint steps with progress
      updateProgress("Initiating mint transaction...", 20)

      // Simulate a delay for the first step
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Mint the NFT with better progress updates
      let nftInfo
      try {
        updateProgress("Creating NFT on-chain...", 40)
        nftInfo = await mintNft(mintData)

        // Verify the transaction was successful
        updateProgress("Verifying transaction...", 60)

        // Add a small delay to ensure blockchain state is updated
        await new Promise((resolve) => setTimeout(resolve, 2000))

        updateProgress("Processing platform fee...", 70)

        // Continue with the rest of the mint process...
      } catch (error) {
        console.error("Error during NFT minting:", error)
        toast.error("Transaction failed. Please try again.")
        setIsPurchasing(false)
        return
      }

      updateProgress("Processing platform fee...", 60)

      // Simulate a delay for the third step
      await new Promise((resolve) => setTimeout(resolve, 1000))

      updateProgress("Processing creator payment...", 80)

      // Simulate a delay for the fourth step
      await new Promise((resolve) => setTimeout(resolve, 1000))

      updateProgress("Finalizing mint...", 95)

      // Simulate a delay for the final step
      await new Promise((resolve) => setTimeout(resolve, 1000))

      updateProgress("NFT minted successfully!", 100)

      // Set minted NFT info for success screen
      setMintedNft({
        ...nftInfo,
        name: `${collection.name} #${selectedNft + 1}`,
        image: nftImageUrl,
        mintAddress: nftInfo.nftMint,
        collectionName: collection.name,
        mintPrice: collection.mintPrice,
      })

      toast.success("NFT minted successfully!")

      // Update local collection to reflect the minted NFT
      const updatedCollection = { ...collection }
      if (!updatedCollection.mintedNfts) {
        updatedCollection.mintedNfts = []
      }
      updatedCollection.mintedNfts.push({
        nftMint: nftInfo.nftMint,
        nftIndex: selectedNft,
        nftMetadataUri: availableNfts[selectedNft],
        mintedAt: new Date().toISOString(),
      })

      // Save updated collection to local storage
      collectionStorageService.updateCollection(collection.collectionMint, updatedCollection)

      // Call success callback
      if (onMintSuccess) {
        onMintSuccess({ ...nftInfo, updatedCollection })
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to mint NFT")
      setIsPurchasing(false)
    }
  }

  if (isLoading && !isPurchasing) {
    return <LoadingIndicator message="Loading mint information..." />
  }

  if (isPurchasing && !mintedNft) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Minting NFT</CardTitle>
          <CardDescription>Please wait while your NFT is being minted</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={mintProgress} className="h-2" />
          <p className="text-center text-muted-foreground">{mintStep}</p>
        </CardContent>
      </Card>
    )
  }

  if (mintedNft) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader>
            <CardTitle className="text-center">Mint Successful! 🎉</CardTitle>
            <CardDescription className="text-center">You've successfully minted your NFT!</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="rounded-lg overflow-hidden border border-border w-40 h-40 mb-4">
              <img
                src={mintedNft.image || "/placeholder.svg?height=160&width=160"}
                alt={mintedNft.name}
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="font-medium text-lg mb-4">{mintedNft.name}</h3>

            <div className="w-full space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Collection:</span>
                <span>{mintedNft.collectionName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mint Address:</span>
                <span className="truncate max-w-[120px]">{mintedNft.mintAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price Paid:</span>
                <span>{mintedNft.mintPrice} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform Fee:</span>
                <span>{mintedNft.platformFee} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Creator Payment:</span>
                <span>{mintedNft.creatorPayment} SOL</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(`https://explorer.solana.com/address/${mintedNft.mintAddress}`, "_blank")}
            >
              View on Explorer
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
            <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => setMintedNft(null)}>
              Mint Another
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <Card>
        <CardHeader>
          <CardTitle>Mint an NFT</CardTitle>
          <CardDescription>Mint an NFT from the {collection.name} collection</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="rounded-lg overflow-hidden border border-border">
              {nftImageUrl ? (
                <img
                  src={nftImageUrl || "/placeholder.svg"}
                  alt={`${collection.name} #${selectedNft + 1}`}
                  className="w-full aspect-square object-cover"
                />
              ) : (
                <div className="w-full aspect-square bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground">Loading preview...</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price:</span>
                <span>{collection.mintPrice} SOL</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Creator Royalty:</span>
                <span>{collection.royaltyPercentage}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform Fee:</span>
                <span>8%</span>
              </div>
            </div>

            <Separator />

            <p className="text-xs text-muted-foreground">
              By minting this NFT, you agree to the terms and conditions of WorldNFT Solana Drops. NFTs are
              non-refundable and transactions cannot be reversed.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full bg-primary hover:bg-primary/90"
            onClick={handleMint}
            disabled={!wallet.connected || !canAffordMint}
          >
            {!wallet.connected
              ? "Connect Wallet to Mint"
              : !canAffordMint
                ? `Insufficient Balance (${balance.toFixed(2)} SOL)`
                : `Mint Now for ${collection.mintPrice} SOL`}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

export default MintForm
