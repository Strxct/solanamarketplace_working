import mongoose from 'mongoose';

const CollectionSchema = new mongoose.Schema({
  collectionMetadataUri: {
    type: String,
    required: true
  },
  collectionMint: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    required: true
  },
  creatorAddress: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  image: {
    type: String,  // Blob URL could be converted to a string, but might need more handling if you store it as a URL or actual image
    default: null
  },
  maxSupply: {
    type: Number,
    required: true
  },
  mintPrice: {
    type: Number,
    required: true
  },
  mintedNfts: [{
    nftMint: String,
    nftIndex: Number,
    nftMetadataUri: String,
    mintedAt: Date
  }]
  name: {
    type: String,
    required: true
  },
  nftMetadataUris: {
    type: [String],  // Array of metadata URIs
    required: true
  },
  royaltyPercentage: {
    type: Number,
    required: true
  },
  symbol: {
    type: String,
    required: true
  },

});

export const Collection = mongoose.model('Collection', CollectionSchema);
