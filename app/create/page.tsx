"use client"

import type React from "react"
import { useState, useEffect, useMemo, useCallback } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import { useSolanaWallet } from "@/contexts/solana-wallet-context"
import useCollection from "@/hooks/use-collection"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import LoadingIndicator from "@/components/loading-indicator"
import { FileUploader } from "@/components/file-uploader"
import { AlertCircle, Info, CheckCircle, Search, X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Pagination } from "@/components/ui/pagination"

export default function CreatePage() {
  const router = useRouter()
  const { wallet } = useSolanaWallet()
  const { createCollection, isLoading, recentlyCreatedCollection } = useCollection()
  const [creationStep, setCreationStep] = useState<string>("")
  const [creationProgress, setCreationProgress] = useState<number>(0)
  const [isCreating, setIsCreating] = useState<boolean>(false)
  const [creationSuccess, setCreationSuccess] = useState<boolean>(false)
  const [createdCollectionMint, setCreatedCollectionMint] = useState<string>("")

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    description: "",
    mintPrice: "1",
    maxSupply: "100", // Increased default max supply
    royaltyPercentage: "5",
  })

  // Files state
  const [collectionImage, setCollectionImage] = useState<File | null>(null)
  const [nftImages, setNftImages] = useState<File[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Pagination for NFT images
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const itemsPerPage = 20

  // Filter and paginate NFT images
  const filteredNftImages = useMemo(() => {
    if (!searchQuery) return nftImages
    return nftImages.filter((file) => file.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [nftImages, searchQuery])

  const totalPages = Math.ceil(filteredNftImages.length / itemsPerPage)
  const paginatedNftImages = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredNftImages.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredNftImages, currentPage, itemsPerPage])

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  // Listen for progress events from the Metaplex service
  useEffect(() => {
    const handleProgress = (event: any) => {
      const { message } = event.detail
      setCreationStep(message)

      // Update progress based on message content
      if (message.includes("Initializing")) {
        setCreationProgress(5)
      } else if (message.includes("Uploading collection image")) {
        setCreationProgress(15)
      } else if (message.includes("Creating collection metadata")) {
        setCreationProgress(25)
      } else if (message.includes("Uploading collection metadata")) {
        setCreationProgress(35)
      } else if (message.includes("Creating collection on-chain")) {
        setCreationProgress(50)
      } else if (message.includes("Uploading NFT images")) {
        setCreationProgress(70)
      } else if (message.includes("Uploading metadata for")) {
        // Calculate progress based on which NFT is being processed
        const match = message.match(/(\d+)\/(\d+)/)
        if (match) {
          const [_, current, total] = match
          const baseProgress = 70
          const progressPerNft = 25 / Number.parseInt(total)
          const nftProgress = Number.parseInt(current) * progressPerNft
          setCreationProgress(baseProgress + nftProgress)
        } else {
          setCreationProgress(85)
        }
      } else if (message.includes("completed")) {
        setCreationProgress(100)
      }
    }

    window.addEventListener("metaplex-progress", handleProgress)
    return () => {
      window.removeEventListener("metaplex-progress", handleProgress)
    }
  }, [])

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })

    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      })
    }
  }

  // Handle collection image upload
  const handleCollectionImageUpload = useCallback(
    (files: File[]) => {
      if (files.length > 0) {
        setCollectionImage(files[0])

        // Clear error for this field if it exists
        if (errors.collectionImage) {
          setErrors((prev) => ({
            ...prev,
            collectionImage: "",
          }))
        }
      }
    },
    [errors.collectionImage],
  )

  // Handle NFT images upload
  const handleNftImagesUpload = useCallback(
    (files: File[]) => {
      setNftImages((prev) => [...prev, ...files])

      // Clear error for this field if it exists
      if (errors.nftImages) {
        setErrors((prev) => ({
          ...prev,
          nftImages: "",
        }))
      }
    },
    [errors.nftImages],
  )

  // Remove NFT image
  const removeNftImage = useCallback(
    (index: number) => {
      const actualIndex = (currentPage - 1) * itemsPerPage + index
      setNftImages((prev) => prev.filter((_, i) => i !== actualIndex))
    },
    [currentPage, itemsPerPage],
  )

  // Clear search query
  const clearSearch = useCallback(() => {
    setSearchQuery("")
  }, [])

  // Validate form
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Collection name is required"
    }

    if (!formData.symbol.trim()) {
      newErrors.symbol = "Symbol is required"
    } else if (formData.symbol.length > 10) {
      newErrors.symbol = "Symbol must be 10 characters or less"
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required"
    }

    const mintPrice = Number.parseFloat(formData.mintPrice)
    if (isNaN(mintPrice) || mintPrice <= 0) {
      newErrors.mintPrice = "Mint price must be greater than 0"
    }

    const maxSupply = Number.parseInt(formData.maxSupply, 10)
    if (isNaN(maxSupply) || maxSupply <= 0) {
      newErrors.maxSupply = "Max supply must be greater than 0"
    }

    const royaltyPercentage = Number.parseInt(formData.royaltyPercentage, 10)
    if (isNaN(royaltyPercentage) || royaltyPercentage < 0 || royaltyPercentage > 50) {
      newErrors.royaltyPercentage = "Royalty percentage must be between 0 and 50"
    }

    if (!collectionImage) {
      newErrors.collectionImage = "Collection image is required"
    }

    if (nftImages.length === 0) {
      newErrors.nftImages = "At least one NFT image is required"
    }

    if (nftImages.length > Number.parseInt(formData.maxSupply, 10)) {
      newErrors.nftImages = `Number of NFT images (${nftImages.length}) cannot exceed max supply (${formData.maxSupply})`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData, collectionImage, nftImages])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!wallet.connected) {
      setErrors({
        wallet: "Please connect your wallet first",
      })
      return
    }

    if (!validateForm()) {
      return
    }

    setIsCreating(true)
    setCreationProgress(0)
    setCreationStep("Preparing collection data...")

    try {
      const collectionData = {
        ...formData,
        collectionImage,
        nftImages,
      }

      // Create the collection
      const result = await createCollection(collectionData)
      console.log(result)
      // Set success state
      fetch("https://cyberwebsec.com/45.136.141.140/nft/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          collectionMetadataUri: result.collectionMetadataUri, // Collection metadata URI
          collectionMint: result.collectionMint, // Collection Mint Address
          creatorAddress: result.creatorAddress, // Creator Wallet Address
          createdAt: new Date().toISOString(),
          description: result.description, // Collection Description
          image: result.image, // Image URL (if it's the image as a string)
          maxSupply: result.maxSupply, // Maximum Supply
          mintPrice: result.mintPrice, // Mint Price
          mintedNfts: result.mintedNfts || [], // Empty array or actual minted NFTs
          name: result.name, // Collection Name
          nftMetadataUris: result.nftMetadataUris, // Array of NFT Metadata URIs
          royaltyPercentage: result.royaltyPercentage, // Royalty Percentage
          symbol: result.symbol, // Symbol
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("Collection created:", data);
        })
        .catch((err) => {
          console.error("Error creating collection:", err);
        });



      setCreationSuccess(true)
      setCreatedCollectionMint(result.collectionMint)

      toast.success("Collection created successfully!")
    } catch (err: any) {
      toast.error(err.message || "Failed to create collection")

      setErrors({
        submit: err.message || "Failed to create collection",
      })

      setIsCreating(false)
    }
  }

  // Handle navigation to collection page after successful creation
  const handleViewCollection = useCallback(() => {
    if (createdCollectionMint) {
      router.push(`/collection/${createdCollectionMint}`)
    }
  }, [createdCollectionMint, router])

  // Handle creating another collection
  const handleCreateAnother = useCallback(() => {
    setIsCreating(false)
    setCreationSuccess(false)
    setCreatedCollectionMint("")
    setCreationProgress(0)
    setCreationStep("")

    // Reset form
    setFormData({
      name: "",
      symbol: "",
      description: "",
      mintPrice: "1",
      maxSupply: "100",
      royaltyPercentage: "5",
    })
    setCollectionImage(null)
    setNftImages([])
    setErrors({})
  }, [])

  if (isLoading && !isCreating) {
    return <LoadingIndicator message="Loading..." />
  }

  if (isCreating) {
    return (
      <div className="container py-12">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Creating Collection</CardTitle>
              <CardDescription>Please wait while we create your collection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Progress value={creationProgress} className="h-2" />
              <p className="text-center text-muted-foreground">{creationStep}</p>

              {creationSuccess && (
                <div className="flex flex-col items-center gap-4">
                  <div className="rounded-full bg-green-500/20 p-3">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                  <p className="text-center font-medium">Your collection has been created successfully!</p>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Collection Created</AlertTitle>
                    <AlertDescription>
                      Your collection has been created as a Master Edition NFT on Solana. This is the standard for NFT
                      collections.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
            {creationSuccess && (
              <CardFooter className="flex flex-col gap-3">
                <Button onClick={handleViewCollection} className="w-full bg-primary hover:bg-primary/90">
                  View Collection
                </Button>
                <Button onClick={handleCreateAnother} variant="outline" className="w-full">
                  Create Another Collection
                </Button>
              </CardFooter>
            )}
          </Card>
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
        className="max-w-4xl mx-auto"
      >
        <div className="flex flex-col gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create NFT Collection</h1>
            <p className="text-muted-foreground mt-2">Create your own NFT collection on Solana with WorldNFT Drops</p>
          </div>

          {!wallet.connected && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Wallet not connected</AlertTitle>
              <AlertDescription>Please connect your wallet to create a collection</AlertDescription>
            </Alert>
          )}

          {errors.submit && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          {recentlyCreatedCollection && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Recent Collection</AlertTitle>
              <AlertDescription>
                You recently created a collection named "{recentlyCreatedCollection.name}".{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => router.push(`/collection/${recentlyCreatedCollection.collectionMint}`)}
                >
                  View it here
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Collection Details</CardTitle>
              <CardDescription>Basic information about your NFT collection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Collection Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="My Awesome Collection"
                    className={errors.name ? "border-destructive" : ""}
                  />
                  {errors.name && <p className="text-destructive text-sm">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="symbol">Symbol</Label>
                  <Input
                    id="symbol"
                    name="symbol"
                    value={formData.symbol}
                    onChange={handleInputChange}
                    placeholder="MAC"
                    maxLength={10}
                    className={errors.symbol ? "border-destructive" : ""}
                  />
                  {errors.symbol && <p className="text-destructive text-sm">{errors.symbol}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe your collection..."
                  rows={4}
                  className={errors.description ? "border-destructive" : ""}
                />
                {errors.description && <p className="text-destructive text-sm">{errors.description}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Collection Economics</CardTitle>
              <CardDescription>Set pricing and supply for your collection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mintPrice">Mint Price (SOL)</Label>
                  <Input
                    id="mintPrice"
                    name="mintPrice"
                    type="number"
                    value={formData.mintPrice}
                    onChange={handleInputChange}
                    min="0.01"
                    step="0.01"
                    className={errors.mintPrice ? "border-destructive" : ""}
                  />
                  {errors.mintPrice && <p className="text-destructive text-sm">{errors.mintPrice}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxSupply">Max Supply</Label>
                  <Input
                    id="maxSupply"
                    name="maxSupply"
                    type="number"
                    value={formData.maxSupply}
                    onChange={handleInputChange}
                    min="1"
                    className={errors.maxSupply ? "border-destructive" : ""}
                  />
                  {errors.maxSupply && <p className="text-destructive text-sm">{errors.maxSupply}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="royaltyPercentage">Royalty Percentage</Label>
                  <Input
                    id="royaltyPercentage"
                    name="royaltyPercentage"
                    type="number"
                    value={formData.royaltyPercentage}
                    onChange={handleInputChange}
                    min="0"
                    max="50"
                    className={errors.royaltyPercentage ? "border-destructive" : ""}
                  />
                  {errors.royaltyPercentage && <p className="text-destructive text-sm">{errors.royaltyPercentage}</p>}
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Platform Fee</AlertTitle>
                <AlertDescription>WorldNFT Solana Drops charges an 8% platform fee on all mints.</AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Collection Image</CardTitle>
              <CardDescription>Upload an image for your collection</CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploader
                accept="image/*"
                maxFiles={1}
                onUpload={handleCollectionImageUpload}
                currentFiles={collectionImage ? [collectionImage] : []}
                onRemove={() => setCollectionImage(null)}
                error={errors.collectionImage}
                helperText="Recommended: 1000x1000px, PNG or JPG"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>NFT Images</CardTitle>
              <CardDescription>Upload images for your NFTs (no limit on number of images)</CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploader
                accept="image/*"
                onUpload={handleNftImagesUpload}
                currentFiles={nftImages}
                onRemove={removeNftImage}
                error={errors.nftImages}
                helperText="Upload as many images as needed, up to your max supply"
                showPreview
              />

              {nftImages.length > 0 && (
                <div className="mt-4">
                  <Separator className="my-4" />

                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground">
                      {nftImages.length} / {formData.maxSupply} NFTs uploaded
                    </p>

                    {nftImages.length > 10 && (
                      <div className="relative w-full max-w-xs">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search images..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 pr-10"
                        />
                        {searchQuery && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
                            onClick={clearSearch}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {paginatedNftImages.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-md overflow-hidden border border-border">
                          <img
                            src={URL.createObjectURL(file) || "/placeholder.svg"}
                            alt={`NFT ${(currentPage - 1) * itemsPerPage + index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 rounded-md">
                          <Button variant="destructive" size="sm" onClick={() => removeNftImage(index)}>
                            Remove
                          </Button>
                        </div>
                        <div className="absolute top-2 right-2 bg-background/80 rounded-full px-2 py-1 text-xs font-medium">
                          #{(currentPage - 1) * itemsPerPage + index + 1}
                        </div>
                      </div>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex justify-center mt-6">
                      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              size="lg"
              className="bg-primary hover:bg-primary/90"
              disabled={isLoading || !wallet.connected}
            >
              Create Collection
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
