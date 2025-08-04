"use client";

import { useEffect, useState } from "react";
import { useSolanaWallet } from "@/contexts/solana-wallet-context";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import LoadingIndicator from "@/components/loading-indicator";
import Image from "next/image";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { clusterApiUrl } from "@solana/web3.js";
import { fetchAllNftsByOwner } from "@metaplex-foundation/mpl-token-metadata";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { publicKey } from "@metaplex-foundation/umi";

export default function ExplorePage() {
  const { wallet, network } = useSolanaWallet();
  const [isLoading, setIsLoading] = useState(true);
  const [listings, setListings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedNft, setSelectedNft] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [price, setPrice] = useState("");
  const fetchListings = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(
        "https://cyberwebsec.com/45.136.141.140:3031/nft/all",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      const data = await res.json();
      const auctions = data.auctions || [];

      const withMetadata = await Promise.all(
        auctions.map(async (item: any) => {
          try {
            const uri = item.metadataUri.replace(
              "ipfs://",
              "https://nftmarketplace.mypinata.cloud/ipfs/"
            );
            const metaRes = await fetch(uri);
            const metadata = await metaRes.json();
            return { ...item, metadata };
          } catch {
            return { ...item, metadata: null };
          }
        })
      );

      setListings(withMetadata);
    } catch (err) {
      console.error("Error fetching auction listings:", err);
      toast.error("Failed to load listings.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleList = (nft: any) => {
    setSelectedNft(nft);
    setShowModal(true);
  };

  const listNft = async (mint: string, price: string) => {
    try {
      const res = await fetch("https://your-api.com/auction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "add",
          mint,
          price,
          metadataUri: selectedNft.metadataUri,
          owner: wallet.publicKey.toBase58(),
        }),
      });

      if (!res.ok) throw new Error("Failed to list NFT");
      toast.success("NFT listed!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to list NFT");
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const handleCancelListing = async (mint: string) => {
    try {
      const res = await fetch(
        "https://cyberwebsec.com/45.136.141.140:3031/nft/all",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      if (!res.ok) throw new Error("Failed to cancel listing");
      toast.success("Listing cancelled!");
      setListings((prev) => prev.filter((nft) => nft.mint !== mint));
    } catch (err) {
      toast.error("Error cancelling listing");
      console.error(err);
    }
  };

  const filteredListings = listings.filter(
    (nft) =>
      nft.metadata?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nft.metadata?.description
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      nft.owner?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) return <LoadingIndicator message="Loading listings..." />;

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
            <h1 className="text-3xl font-bold tracking-tight">Explore NFTs</h1>
            <p className="text-muted-foreground">
              Browse all active NFT listings on Solana
            </p>
          </div>
          {wallet.connected && (
            <Button onClick={() => setShowManageModal(true)}>
              Manage My Listings
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, description, or wallet..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {filteredListings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No NFTs found matching your search.
            </p>
            <Button onClick={() => setSearchQuery("")} variant="outline">
              Clear Search
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((nft, index) => (
              <motion.div
                key={nft.mint}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="overflow-hidden hover:border-primary/50 transition-all duration-300 h-full flex flex-col">
                  <div className="aspect-square overflow-hidden">
                    <Image
                      src={nft.metadata?.image || "/placeholder.svg"}
                      alt={nft.metadata?.name || "NFT"}
                      width={500}
                      height={500}
                      className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle>{nft.metadata?.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-2 flex-grow">
                    <p className="text-muted-foreground line-clamp-2">
                      {nft.metadata?.description}
                    </p>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2 text-sm text-muted-foreground">
                    <div className="flex justify-between w-full">
                      <div>Price: {nft.price} SOL</div>
                      <div>
                        Owner: {nft.owner.slice(0, 4)}...{nft.owner.slice(-4)}
                      </div>
                    </div>
                    {wallet.publicKey?.toBase58() === nft.owner && (
                      <Button
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => handleCancelListing(nft.mint)}
                      >
                        Cancel Listing
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        <ManageListingsModal
          open={showManageModal}
          onClose={() => setShowManageModal(false)}
          walletAddress={wallet.publicKey?.toBase58() || ""}
          onList={handleList} // ✅ add this line
        />
        {showModal && selectedNft && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold mb-4">List NFT</h2>

              <div className="aspect-square overflow-hidden rounded mb-4">
                <Image
                  src={selectedNft.image}
                  alt={selectedNft.name}
                  width={400}
                  height={400}
                  className="w-full h-full object-cover"
                />
              </div>

              <p className="text-muted-foreground mb-2">{selectedNft.name}</p>

              <Input
                type="number"
                placeholder="Enter price in SOL"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mb-4"
              />

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // Call your list API here
                    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
                      toast.error("Enter a valid price.");
                      return;
                    }
                    listNft(selectedNft.mint, price);
                    setShowModal(false);
                  }}
                >
                  Confirm Listing
                </Button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function ManageListingsModal({
  open,
  onClose,
  walletAddress,
  onList,
}: {
  open: boolean;
  onClose: () => void;
  walletAddress: string;
  onList: (nft: any) => void; // ✅ define expected function
}) {
  const [nfts, setNfts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const umi = createUmi(clusterApiUrl("devnet"));

  useEffect(() => {
    if (!open || !walletAddress) return;

    const fetchUserNfts = async () => {
      setLoading(true);
      console.log("Fetching NFTs for wallet:", walletAddress);
      try {
        const res = await fetch(
          "https://solana-gateway.moralis.io/account/mainnet/" +
            walletAddress +
            "/nft?nftMetadata=true&mediaItems=false&excludeSpam=false&includeFungibleAssets=false",
          {
            headers: {
              "X-API-Key":
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjUxMWViYjg1LWNjN2UtNGE3NS05MTk4LTY1YWQzYThjODY2MCIsIm9yZ0lkIjoiNDA4MTYxIiwidXNlcklkIjoiNDE5NDA3IiwidHlwZSI6IlBST0pFQ1QiLCJ0eXBlSWQiOiIxODUxNGUwYy1jMzg4LTQ2M2QtYWFmZS1jNjI3YzU1OGE4YTUiLCJpYXQiOjE3MzY3NjM4NjAsImV4cCI6NDg5MjUyMzg2MH0.IRVQs-jyz_iFSwHuROOaXufvarKzdghYsE6qN_E_-5A",
            },
          }
        );
        console.log("Fetching NFTs for wallet:", walletAddress);

        const data = await res.json();
        console.log("Fetching NFTs fodsadasr wallet:", data);

        if (!data || !Array.isArray(data)) {
          toast.error("Invalid response from Moralis");
          setNfts([]);
          return;
        }

        const formatted = data.map((nft: any) => {
          const image = nft.image?.startsWith("ipfs://")
            ? nft.image.replace(
                "ipfs://",
                "https://nftmarketplace.mypinata.cloud/ipfs/"
              )
            : nft.properties?.files?.[0]?.uri?.replace(
                "ipfs://",
                "https://nftmarketplace.mypinata.cloud/ipfs/"
              ) || "/placeholder.svg";

          return {
            mint: nft.mint,
            name: nft.name,
            description: nft.description || nft.collection?.description || "",
            image,
          };
        });
        console.log("Fetched NFTs:", formatted);
        setNfts(formatted);
      } catch (error) {
        toast.error("Failed to fetch NFTs from Moralis");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserNfts();
  }, [open, walletAddress]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Manage My NFTs</DialogTitle>
        </DialogHeader>

        {loading ? (
          <LoadingIndicator message="Loading your NFTs..." />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {nfts.map((nft, index) => (
              <Card key={index} className="flex flex-col">
                <div className="aspect-square overflow-hidden">
                  <Image
                    src={nft.image}
                    alt={nft.name || "NFT"}
                    width={300}
                    height={300}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardHeader className="pb-1">
                  <CardTitle className="text-base">{nft.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground line-clamp-2">
                  {nft.description}
                </CardContent>
                <CardFooter>
                  <Button onClick={() => onList(nft)} className="w-full">

                    List NFT
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
