/**
 * Thumbnail service that handles batching, caching, and async loading
 */

import { thumbnailCache } from './thumbnailCache'
import { retrieveThumbnailsBatch } from './thumbnailStorage'

interface ThumbnailRequest {
    vectorSetName: string
    elementId: string
    resolve: (thumbnail: string | null) => void
    reject: (error: Error) => void
}

interface BatchRequest {
    vectorSetName: string
    elementIds: string[]
    requests: Map<string, ThumbnailRequest[]>
}

class ThumbnailService {
    private static instance: ThumbnailService
    private pendingRequests = new Map<string, ThumbnailRequest[]>()
    private batchTimeout: NodeJS.Timeout | null = null
    private readonly BATCH_DELAY_MS = 50 // Debounce delay
    private readonly MAX_BATCH_SIZE = 50 // Maximum elements per batch

    private constructor() {}

    static getInstance(): ThumbnailService {
        if (!ThumbnailService.instance) {
            ThumbnailService.instance = new ThumbnailService()
        }
        return ThumbnailService.instance
    }

    /**
     * Request a single thumbnail (async)
     */
    async getThumbnail(vectorSetName: string, elementId: string): Promise<string | null> {
        // First check cache
        const cached = thumbnailCache.get(vectorSetName, elementId)
        if (cached !== null) {
            return cached
        }

        // If not in cache, add to batch request
        return new Promise<string | null>((resolve, reject) => {
            const key = `${vectorSetName}:${elementId}`

            if (!this.pendingRequests.has(key)) {
                this.pendingRequests.set(key, [])
            }

            this.pendingRequests.get(key)!.push({
                vectorSetName,
                elementId,
                resolve,
                reject
            })

            this.scheduleBatch()
        })
    }

    /**
     * Request multiple thumbnails (async)
     */
    async getThumbnails(vectorSetName: string, elementIds: string[]): Promise<Record<string, string | null>> {
        if (elementIds.length === 0) {
            return {}
        }

        // Check cache first
        const cached = thumbnailCache.getMultiple(vectorSetName, elementIds)
        const uncachedIds = elementIds.filter(id => !(id in cached))

        // If all are cached, return immediately
        if (uncachedIds.length === 0) {
            return cached
        }

        // For uncached items, use batch request
        try {
            const batchResults = await retrieveThumbnailsBatch(vectorSetName, uncachedIds)

            // Cache the results
            thumbnailCache.setMultiple(vectorSetName, batchResults)

            // Combine cached and batch results
            return { ...cached, ...batchResults }
        } catch (error) {
            console.error('Error in batch thumbnail request:', error)

            // Return cached results even if batch fails
            const fallbackResults: Record<string, string | null> = { ...cached }
            uncachedIds.forEach(id => {
                fallbackResults[id] = null
            })
            return fallbackResults
        }
    }

    /**
     * Preload thumbnails for better performance
     */
    async preloadThumbnails(vectorSetName: string, elementIds: string[]): Promise<void> {
        if (elementIds.length === 0) return

        // Check which ones are not in cache
        const uncachedIds = elementIds.filter(id => 
            thumbnailCache.get(vectorSetName, id) === null
        )

        if (uncachedIds.length === 0) return

        try {
            // Load in chunks to avoid overwhelming the server
            const chunkSize = this.MAX_BATCH_SIZE
            for (let i = 0; i < uncachedIds.length; i += chunkSize) {
                const chunk = uncachedIds.slice(i, i + chunkSize)
                const results = await retrieveThumbnailsBatch(vectorSetName, chunk)
                thumbnailCache.setMultiple(vectorSetName, results)
            }
        } catch (error) {
            console.error('Error preloading thumbnails:', error)
        }
    }

    /**
     * Schedule a batch request with debouncing
     */
    private scheduleBatch(): void {
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout)
        }

        this.batchTimeout = setTimeout(() => {
            this.processBatch()
        }, this.BATCH_DELAY_MS)
    }

    /**
     * Process pending requests in batches
     */
    private async processBatch(): Promise<void> {
        if (this.pendingRequests.size === 0) return

        // Group requests by vector set
        const batchesByVectorSet = new Map<string, BatchRequest>()

        for (const [key, requests] of this.pendingRequests.entries()) {
            const [vectorSetName, elementId] = key.split(':')

            if (!batchesByVectorSet.has(vectorSetName)) {
                batchesByVectorSet.set(vectorSetName, {
                    vectorSetName,
                    elementIds: [],
                    requests: new Map()
                })
            }

            const batch = batchesByVectorSet.get(vectorSetName)!
            batch.elementIds.push(elementId)
            batch.requests.set(elementId, requests)
        }

        // Clear pending requests
        this.pendingRequests.clear()

        // Process each vector set batch
        for (const batch of batchesByVectorSet.values()) {
            this.processBatchForVectorSet(batch)
        }
    }

    /**
     * Process a batch for a specific vector set
     */
    private async processBatchForVectorSet(batch: BatchRequest): Promise<void> {
        try {
            // Split into smaller chunks if needed
            const chunks = this.chunkArray(batch.elementIds, this.MAX_BATCH_SIZE)
            
            for (const chunk of chunks) {
                try {
                    const results = await retrieveThumbnailsBatch(batch.vectorSetName, chunk)
                    
                    // Cache results
                    thumbnailCache.setMultiple(batch.vectorSetName, results)
                    
                    // Resolve requests
                    for (const elementId of chunk) {
                        const requests = batch.requests.get(elementId) || []
                        const thumbnail = results[elementId] || null
                        
                        requests.forEach(request => {
                            request.resolve(thumbnail)
                        })
                    }
                } catch (error) {
                    console.error(`Error processing chunk for ${batch.vectorSetName}:`, error)
                    
                    // Reject requests in this chunk
                    for (const elementId of chunk) {
                        const requests = batch.requests.get(elementId) || []
                        requests.forEach(request => {
                            request.reject(error instanceof Error ? error : new Error('Unknown error'))
                        })
                    }
                }
            }
        } catch (error) {
            console.error(`Error processing batch for ${batch.vectorSetName}:`, error)
            
            // Reject all requests in this batch
            for (const requests of batch.requests.values()) {
                requests.forEach(request => {
                    request.reject(error instanceof Error ? error : new Error('Unknown error'))
                })
            }
        }
    }

    /**
     * Split array into chunks
     */
    private chunkArray<T>(array: T[], chunkSize: number): T[][] {
        const chunks: T[][] = []
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize))
        }
        return chunks
    }

    /**
     * Clear cache for a vector set
     */
    clearVectorSetCache(vectorSetName: string): void {
        thumbnailCache.clearVectorSet(vectorSetName)
    }

    /**
     * Clear all cache
     */
    clearCache(): void {
        thumbnailCache.clear()
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return thumbnailCache.getStats()
    }
}

// Export singleton instance
export const thumbnailService = ThumbnailService.getInstance()
