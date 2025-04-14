"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import LoadingIndicator from "@/components/loading-indicator"

export default function ExplorePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [collections, setCollections] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    // Simulate fetching collections
    const fetchCollections = async () => {
      // In a real app, this would be an API call
      setTimeout(() => {
        setCollections([
          {
            id: "1",
            name: "Cosmic Explorers",
            description: "A collection of cosmic explorers traversing the universe",
            image: "/placeholder.svg?height=300&width=300",
            creator: "Cosmic Studios",
            price: 1.5,
            items: 10,
          },
          {
            id: "2",
            name: "Digital Dreams",
            description: "A collection of surreal digital dreamscapes",
            image: "/placeholder.svg?height=300&width=300",
            creator: "Dream Labs",
            price: 2.0,
            items: 20,
          },
          {
            id: "3",
            name: "Pixel Punks",
            description: "Retro-inspired pixel art characters",
            image: "/placeholder.svg?height=300&width=300",
            creator: "Pixel Collective",
            price: 0.8,
            items: 100,
          },
          {
            id: "4",
            name: "Abstract Wonders",
            description: "Abstract art pieces that challenge perception",
            image: "/placeholder.svg?height=300&width=300",
            creator: "Abstract Artists",
            price: 3.0,
            items: 15,
          },
          {
            id: "5",
            name: "Future Fauna",
            description: "Futuristic animal species from another dimension",
            image: "/placeholder.svg?height=300&width=300",
            creator: "Future Labs",
            price: 1.2,
            items: 50,
          },
          {
            id: "6",
            name: "Mystic Realms",
            description: "Magical landscapes from mystical realms",
            image: "/placeholder.svg?height=300&width=300",
            creator: "Mystic Creators",
            price: 2.5,
            items: 25,
          },
        ])
        setIsLoading(false)
      }, 1500)
    }

    fetchCollections()
  }, [])

  const filteredCollections = collections.filter(
    (collection) =>
      collection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      collection.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      collection.creator.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (isLoading) {
    return <LoadingIndicator message="Loading collections..." />
  }

  return (
    <div className="container py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Explore Collections</h1>
          <p className="text-muted-foreground">Discover and collect unique NFTs on the Solana blockchain</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search collections..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {filteredCollections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">No collections found matching your search.</p>
            <Button onClick={() => setSearchQuery("")} variant="outline">
              Clear Search
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCollections.map((collection, index) => (
              <motion.div
                key={collection.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Link href={`/collection/${collection.id}`}>
                  <Card className="overflow-hidden hover:border-primary/50 transition-all duration-300 h-full flex flex-col">
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={collection.image || "/placeholder.svg"}
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
                      <div>By {collection.creator}</div>
                      <div className="flex gap-2">
                        <span>{collection.price} SOL</span>
                        <span>•</span>
                        <span>{collection.items} items</span>
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
