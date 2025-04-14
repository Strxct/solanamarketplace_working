"use client"

import axios from "axios"

// Pinata API endpoints
const PINATA_API_URL = "https://api.pinata.cloud/pinning"

/**
 * Service for interacting with Pinata IPFS
 */
class PinataService {
  private apiKey: string
  private apiSecret: string
  private jwt: string

  constructor() {
    // These would be environment variables in production
    this.apiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY || ""
    this.apiSecret = process.env.NEXT_PUBLIC_PINATA_API_SECRET || ""
    this.jwt = process.env.NEXT_PUBLIC_PINATA_JWT || ""
  }

  /**
   * Upload a file to IPFS via Pinata
   * @param file File to upload
   * @param name Name for the file
   * @returns IPFS URI
   */
  async uploadFile(file: File, name: string): Promise<string> {
    try {
      const formData = new FormData()
      formData.append("file", file)

      const metadata = JSON.stringify({
        name,
        keyvalues: {
          source: "WorldNFT Solana Drops",
          timestamp: Date.now().toString(),
        },
      })
      formData.append("pinataMetadata", metadata)

      const options = JSON.stringify({
        cidVersion: 0,
      })
      formData.append("pinataOptions", options)

      const response = await axios.post(`${PINATA_API_URL}/pinFileToIPFS`, formData, {
        headers: {
          "Content-Type": `multipart/form-data;`,
          Authorization: `Bearer ${this.jwt}`,
        },
      })

      if (response.status === 200) {
        return `https://nftmarketplace.mypinata.cloud/ipfs/${response.data.IpfsHash}`
      } else {
        throw new Error("Failed to upload file to IPFS")
      }
    } catch (error) {
      console.error("Error uploading file to Pinata:", error)
      throw error
    }
  }

  /**
   * Upload JSON data to IPFS via Pinata
   * @param jsonData JSON data to upload
   * @param name Name for the data
   * @returns IPFS URI
   */
  async uploadJson(jsonData: any, name: string): Promise<string> {
    try {
      const data = JSON.stringify({
        pinataOptions: {
          cidVersion: 0,
        },
        pinataMetadata: {
          name,
          keyvalues: {
            source: "WorldNFT Solana Drops",
            timestamp: Date.now().toString(),
          },
        },
        pinataContent: jsonData,
      })

      const response = await axios.post(`${PINATA_API_URL}/pinJSONToIPFS`, data, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.jwt}`,
        },
      })

      if (response.status === 200) {
        return `https://nftmarketplace.mypinata.cloud/ipfs/${response.data.IpfsHash}`
      } else {
        throw new Error("Failed to upload JSON to IPFS")
      }
    } catch (error) {
      console.error("Error uploading JSON to Pinata:", error)
      throw error
    }
  }

  /**
   * Convert IPFS URI to HTTP URL for fetching
   * @param ipfsUri IPFS URI
   * @returns HTTP URL
   */
  ipfsToHttp(ipfsUri: string): string {
    if (!ipfsUri) return ""

    if (ipfsUri.startsWith("ipfs://")) {
      // Use Pinata gateway for IPFS URIs
      return `https://gateway.pinata.cloud/ipfs/${ipfsUri.slice(7)}`
    }

    if (ipfsUri.startsWith("https://")) {
      return ipfsUri
    }

    // Handle case where the URI is just the CID
    if (ipfsUri.match(/^[a-zA-Z0-9]{46}$/)) {
      return `https://gateway.pinata.cloud/ipfs/${ipfsUri}`
    }

    return `https://gateway.pinata.cloud/ipfs/${ipfsUri}`
  }
}

// Create and export a singleton instance
const pinataService = new PinataService()
export default pinataService
