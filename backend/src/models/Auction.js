const AuctionSchema = new mongoose.Schema({
  mint: String,
  owner: String,
  metadataUri: String,
  price: Number,
  createdAt: Date,
})

const Auction = mongoose.model("Auction", AuctionSchema)