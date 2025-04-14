"use client"

import { motion } from "framer-motion"
import { ArrowRight, Sparkles, Shield, Zap } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useSolanaWallet } from "@/contexts/solana-wallet-context"

// Import the collection storage service
import { useEffect, useState } from "react"

export default function Home() {
  const { wallet } = useSolanaWallet()

  // Add this state inside the Home component
  const [latestCollections, setLatestCollections] = useState<any[]>([])

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const response = await fetch("http://localhost:3020/nft/all", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({})
        });

        const data = await response.json();
        console.log("Fetched Collections:", data.collections);

        const latest = data.collections.slice(0, 4);

        // Fetch metadata for each collection
        const collectionsWithImages = await Promise.all(
          latest.map(async (collection: any) => {
            try {
              const metadataResponse = await fetch(collection.collectionMetadataUri.replace("ipfs://", "https://nftmarketplace.mypinata.cloud/ipfs/"));
              const metadata = await metadataResponse.json();

              return {
                ...collection,
                image: metadata.image // attach image from metadata
              };
            } catch (err) {
              console.error(`Failed to fetch metadata for ${collection.collectionMint}`, err);
              return {
                ...collection,
                image: "/placeholder.svg?height=150&width=150" // fallback image
              };
            }
          })
        );

        console.log("Collections with Images:", collectionsWithImages);
        setLatestCollections(collectionsWithImages);

      } catch (error) {
        console.error("Failed to fetch collections:", error);
      }
    };

    fetchCollections();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="py-20 md:py-28 container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-6"
          >
            <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80 w-fit">
              <Sparkles className="mr-1 h-3 w-3" />
              Solana NFT Platform
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Create and Collect <span className="text-primary">Solana NFTs</span> with Ease
            </h1>
            <p className="text-muted-foreground text-lg">
              WorldNFT Solana Drops is a modern platform for creating, minting, and collecting NFTs on the Solana
              blockchain.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
                <Link href="/explore">Explore Collections</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary/20 hover:bg-primary/10">
                <Link href="/create">Create Collection</Link>
              </Button>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 via-purple-500/10 to-primary/5 p-1">
              <div className="h-full w-full rounded-xl bg-card p-4 backdrop-blur-sm">
                <div className="grid grid-cols-2 gap-4 h-full">
                  {latestCollections.length > 0
                    ? latestCollections.map((collection, index) => (
                        <Link
                          key={collection.collectionMint}
                          href={`/collection/${collection.collectionMint}`}
                          className="aspect-square rounded-lg overflow-hidden hover:scale-105 transition-transform duration-300"
                        >
                          <img
                            src={collection.image || "/placeholder.svg?height=150&width=150"}
                            alt={collection.name}
                            className="w-full h-full object-cover"
                          />
                        </Link>
                      ))
                    : [1, 2, 3, 4].map((i) => (
                        <div key={i} className="aspect-square rounded-lg bg-muted/50 shimmer"></div>
                      ))}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-2xl bg-primary/20 blur-2xl"></div>
            <div className="absolute -top-6 -left-6 h-24 w-24 rounded-full bg-primary/20 blur-2xl"></div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose WorldNFT Solana Drops?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Our platform offers a seamless experience for creators and collectors alike.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Zap className="h-10 w-10 text-primary" />,
                title: "Fast & Affordable",
                description: "Leverage Solana's high-speed, low-cost blockchain for efficient NFT transactions.",
              },
              {
                icon: <Shield className="h-10 w-10 text-primary" />,
                title: "Secure & Reliable",
                description: "Built with industry-leading security practices to protect your digital assets.",
              },
              {
                icon: <Sparkles className="h-10 w-10 text-primary" />,
                title: "Creator-Friendly",
                description: "Intuitive tools to help you create, mint, and manage your NFT collections.",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                className="flex flex-col items-center text-center p-6 rounded-xl border border-border/50 bg-card"
              >
                <div className="p-3 rounded-full bg-primary/10 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl bg-gradient-to-br from-primary/20 via-purple-500/10 to-primary/5 p-1"
        >
          <div className="rounded-xl bg-card p-8 md:p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Your NFT Journey?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
              Join WorldNFT Solana Drops today and discover the exciting world of Solana NFTs.
            </p>
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
              <Link href={wallet.connected ? "/create" : "/"} className="flex items-center gap-2">
                {wallet.connected ? "Create Your Collection" : "Connect Wallet to Start"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
