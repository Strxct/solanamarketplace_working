"use client"

/**
 * Service for storing and retrieving collection data locally
 */
class CollectionStorageService {
  private readonly STORAGE_KEY = "worldnft_collections"
  private readonly RECENT_COLLECTION_KEY = "worldnft_recent_collection"
  private collections: any[] = []
  private initialized = false

  constructor() {
    // Initialize collections from localStorage if available
    if (typeof window !== "undefined") {
      this.loadCollections()
    }
  }

/**
 * Load collections from the backend
 */
private async loadCollections(): Promise<void> {
  try {
    // Fetch collections from the backend using a POST request
    const response = await fetch("https://cyberwebsec.com/45.136.141.140/nft/all", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({}) // Add any request body if needed
    });

    // Check if the response is successful
    if (!response.ok) {
      throw new Error(`Failed to fetch collections: ${response.statusText}`);
    }

    // Parse the JSON response from the backend
    const collectionsData = await response.json();

    // Ensure that collectionsData is an array
    if (Array.isArray(collectionsData)) {
      this.collections = collectionsData;
    } else {
      console.warn("Backend returned data that is not an array. Setting collections to an empty array.");
      this.collections = []; // Fallback to an empty array if the data is not an array
    }

    // Mark as initialized
    this.initialized = true;
  } catch (error) {
    console.error("Error loading collections from the backend:", error);
    this.collections = []; // Fallback to an empty array if the request fails
    this.initialized = true;
  }
}

  /**
   * Save a collection to local storage
   * @param collection Collection data to save
   */
  saveCollection(collection: any): void {
    try {
      if (!this.initialized && typeof window !== "undefined") {
        this.loadCollections()
      }

      // Save as recent collection
      localStorage.setItem(
        this.RECENT_COLLECTION_KEY,
        JSON.stringify({
          ...collection,
          savedAt: new Date().toISOString(),
        }),
      )

      // Also add to collections list
      const existingIndex = this.collections.findIndex((c) => c.collectionMint === collection.collectionMint)

      if (existingIndex >= 0) {
        // Update existing collection
        this.collections[existingIndex] = {
          ...this.collections[existingIndex],
          ...collection,
          updatedAt: new Date().toISOString(),
        }
      } else {
        // Add new collection
        this.collections.push({
          ...collection,
          createdAt: new Date().toISOString(),
        })
      }

      // Save to localStorage
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.collections))
    } catch (error) {
      console.error("Error saving collection to local storage:", error)
    }
  }
/**
 * Get all collections from the backend
 * @returns Array of collections
 */
async getCollections(): Promise<any[]> {
  if (!this.initialized && typeof window !== "undefined") {
    await this.loadCollections();  // Wait for the collections to be loaded from the backend
  }

  console.log(...this.collections);  // Logs the collections to the console
  return [...this.collections];      // Return a copy of the collections array
}
  /**
   * Get a collection by mint address
   * @param collectionMint Collection mint address
   * @returns Collection data or null if not found
   */
  getCollectionByMint(collectionMint: string): any | null {
    if (!this.initialized && typeof window !== "undefined") {
      this.loadCollections()
    }
    return this.collections.find((c) => c.collectionMint === collectionMint) || null
  }

  /**
   * Get the most recently created collection
   * @returns Recent collection data or null if none exists
   */
  getRecentCollection(): any | null {
    try {
      const recentJson = localStorage.getItem(this.RECENT_COLLECTION_KEY)
      if (!recentJson) return null

      const recentCollection = JSON.parse(recentJson)

      // Check if the collection was created in the last 24 hours
      const savedAt = new Date(recentCollection.savedAt)
      const now = new Date()
      const hoursDiff = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60)

      return hoursDiff < 24 ? recentCollection : null
    } catch (error) {
      console.error("Error getting recent collection from local storage:", error)
      return null
    }
  }

  /**
   * Clear the recent collection
   */
  clearRecentCollection(): void {
    try {
      localStorage.removeItem(this.RECENT_COLLECTION_KEY)
    } catch (error) {
      console.error("Error clearing recent collection from local storage:", error)
    }
  }

  /**
   * Update a collection in local storage
   * @param collectionMint Collection mint address
   * @param updates Updates to apply to the collection
   * @returns Updated collection or null if not found
   */
  updateCollection(collectionMint: string, updates: any): any | null {
    try {
      if (!this.initialized && typeof window !== "undefined") {
        this.loadCollections()
      }

      const collectionIndex = this.collections.findIndex((c) => c.collectionMint === collectionMint)

      if (collectionIndex === -1) return null

      const updatedCollection = {
        ...this.collections[collectionIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      }

      this.collections[collectionIndex] = updatedCollection
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.collections))

      // Also update recent collection if it's the same one
      const recentCollection = this.getRecentCollection()
      if (recentCollection && recentCollection.collectionMint === collectionMint) {
        localStorage.setItem(this.RECENT_COLLECTION_KEY, JSON.stringify(updatedCollection))
      }

      return updatedCollection
    } catch (error) {
      console.error("Error updating collection in local storage:", error)
      return null
    }
  }

  /**
   * Get the latest collections
   * @param limit Number of collections to return
   * @returns Array of the latest collections
   */
  getLatestCollections(limit = 4): any[] {
    if (!this.initialized && typeof window !== "undefined") {
      this.loadCollections()
    }

    // Sort by creation date (newest first) and take the specified number
    return [...this.collections]
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime()
        const dateB = new Date(b.createdAt || 0).getTime()
        return dateB - dateA
      })
      .slice(0, limit)
  }
}

// Create and export a singleton instance
const collectionStorageService = new CollectionStorageService()
export default collectionStorageService
