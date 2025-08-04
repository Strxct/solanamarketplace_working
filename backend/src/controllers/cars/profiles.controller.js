import { Collection } from "../../models/collection.js";
import { Auction } from "../../models/Auction.js";
// CREATE a new collection
export const createCollection = async (req, res) => {
  console.log("Received create request:", req.body);

  try {
    const {
      collectionMetadataUri,
      collectionMint,
      creatorAddress,
      description,
      createdAt,
      image,
      maxSupply,
      mintPrice,
      mintedNfts,
      name,
      nftMetadataUris,
      royaltyPercentage,
      symbol,
    } = req.body;

    if (
      !collectionMetadataUri ||
      !collectionMint ||
      !creatorAddress ||
      !description ||
      !createdAt ||
      !maxSupply ||
      !mintPrice ||
      !royaltyPercentage ||
      !symbol ||
      !name ||
      !nftMetadataUris
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newCollection = new Collection({
      collectionMetadataUri,
      collectionMint,
      creatorAddress,
      description,
      image,
      maxSupply,
      mintPrice,
      mintedNfts,
      name,
      createdAt,
      nftMetadataUris,
      royaltyPercentage,
      symbol,
    });

    await newCollection.save();
    return res.status(201).json({ message: "Collection created successfully", collection: newCollection });
  } catch (error) {
    console.error("Error creating collection:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
// GET all collections
export const getAllCollections = async (req, res) => {
  console.log("Fetching all collections");

  try {
    const collections = await Collection.find();
    console.log("Fetched collections:", collections);  // Fixed typo: changed console.error to console.log
    if (!collections.length) {
      return res.status(404).json({ message: "No collections found" });
    }

    return res.status(200).json({ collections });
  } catch (error) {
    console.error("Error fetching collections:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const updateCollection = async (req, res) => {
  const { collectionMint, mintedNfts, ...rest } = req.body;

  if (!collectionMint) {
    return res.status(400).json({ message: "Collection Mint is required for update" });
  }

  try {
    const updateQuery = {};

    // Push new minted NFT(s) to the existing array if provided
    if (mintedNfts && Array.isArray(mintedNfts) && mintedNfts.length > 0) {
      updateQuery.$push = { mintedNfts: { $each: mintedNfts } };
    }

    // Set other fields (if any)
    if (Object.keys(rest).length > 0) {
      updateQuery.$set = rest;
    }

    const updatedCollection = await Collection.findOneAndUpdate(
      { collectionMint },
      updateQuery,
      { new: true }
    );

    if (!updatedCollection) {
      return res.status(404).json({ message: "Collection not found" });
    }

    return res.status(200).json({
      message: "Collection updated successfully",
      collection: updatedCollection,
    });
  } catch (error) {
    console.error("Error updating collection:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET collections by creatorAddress
export const getCollectionsByOwner = async (req, res) => {
  const { creatorAddress } = req.body;

  if (!creatorAddress) {
    return res.status(400).json({ message: "Creator address is required" });
  }

  try {
    const collections = await Collection.find({ creatorAddress });

    if (!collections.length) {
      return res.status(404).json({ message: "No collections found for this creator" });
    }

    return res.status(200).json({ collections });
  } catch (error) {
    console.error("Error fetching collections by owner:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET a single collection by collectionMint
export const getSingleCollection = async (req, res) => {
  const { collectionMint } = req.body;

  if (!collectionMint) {
    return res.status(400).json({ message: "Collection Mint is required" });
  }

  try {
    const collection = await Collection.findOne({ collectionMint });

    if (!collection) {
      return res.status(404).json({ message: "Collection not found" });
    }

    return res.status(200).json({ collection });
  } catch (error) {
    console.error("Error fetching collection:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};




export const handleAuction = async (req, res) => {
  const { method, mint, owner, price, metadataUri, id, createdAt } = req.body

  if (!method) {
    return res.status(400).json({ message: "Method is required: 'fetch', 'add', or 'remove'" })
  }

  try {
    switch (method) {
      case "fetch": {
        const auctions = await Auction.find().sort({ createdAt: -1 })
        return res.status(200).json({ auctions })
      }

      case "add": {
        if (!mint || !owner || !price || !metadataUri) {
          return res.status(400).json({
            message: "Missing required fields: mint, owner, price, metadataUri",
          })
        }

        const exists = await Auction.findOne({ mint })
        if (exists) {
          return res.status(409).json({ message: "Auction already exists for this mint" })
        }

        const auction = new Auction({
          mint,
          owner,
          price,
          metadataUri,
          createdAt: createdAt || new Date().toISOString(),
        })

        await auction.save()
        return res.status(201).json({ message: "Auction created", auction })
      }

      case "remove": {
        if (!mint && !id) {
          return res.status(400).json({ message: "Provide 'mint' or 'id' to remove auction" })
        }

        const removed = mint
          ? await Auction.findOneAndDelete({ mint })
          : await Auction.findByIdAndDelete(id)

        if (!removed) {
          return res.status(404).json({ message: "Auction not found" })
        }

        return res.status(200).json({ message: "Auction removed", removed })
      }

      default:
        return res.status(400).json({ message: `Unsupported method: ${method}` })
    }
  } catch (error) {
    console.error("Auction handler error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}
