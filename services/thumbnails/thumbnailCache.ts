/**
 * Client-side thumbnail cache using localStorage with expiration
 */

interface CachedThumbnail {
    data: string | null
    timestamp: number
    vectorSetName: string
    elementId: string
}

interface CacheStats {
    totalItems: number
    totalSize: number
    hitRate: number
    missRate: number
}

class ThumbnailCache {
    private static instance: ThumbnailCache
    private readonly CACHE_PREFIX = 'thumbnail_cache_'
    private readonly CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours
    private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024 // 50MB
    private hits = 0
    private misses = 0

    private constructor() {
        // Clean up expired items on initialization (only in browser)
        if (this.isBrowser()) {
            this.cleanupExpired()
        }
    }

    static getInstance(): ThumbnailCache {
        if (!ThumbnailCache.instance) {
            ThumbnailCache.instance = new ThumbnailCache()
        }
        return ThumbnailCache.instance
    }

    /**
     * Check if we're running in a browser environment
     */
    private isBrowser(): boolean {
        return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
    }

    private generateCacheKey(vectorSetName: string, elementId: string): string {
        return `${this.CACHE_PREFIX}${vectorSetName}:${elementId}`
    }

    /**
     * Get thumbnail from cache
     */
    get(vectorSetName: string, elementId: string): string | null {
        if (!this.isBrowser()) {
            this.misses++
            return null
        }

        try {
            const key = this.generateCacheKey(vectorSetName, elementId)
            const cached = localStorage.getItem(key)

            if (!cached) {
                this.misses++
                return null
            }

            const parsedCache: CachedThumbnail = JSON.parse(cached)

            // Check if expired
            if (Date.now() - parsedCache.timestamp > this.CACHE_EXPIRY_MS) {
                localStorage.removeItem(key)
                this.misses++
                return null
            }

            this.hits++
            return parsedCache.data
        } catch (error) {
            console.warn('Error reading from thumbnail cache:', error)
            this.misses++
            return null
        }
    }

    /**
     * Set thumbnail in cache
     */
    set(vectorSetName: string, elementId: string, data: string | null): void {
        if (!this.isBrowser()) {
            return
        }

        try {
            // Check cache size before adding
            if (this.getCurrentCacheSize() > this.MAX_CACHE_SIZE) {
                this.evictOldest()
            }

            const key = this.generateCacheKey(vectorSetName, elementId)
            const cacheItem: CachedThumbnail = {
                data,
                timestamp: Date.now(),
                vectorSetName,
                elementId
            }

            localStorage.setItem(key, JSON.stringify(cacheItem))
        } catch (error) {
            console.warn('Error writing to thumbnail cache:', error)
            // If we can't cache, that's not a critical error
        }
    }

    /**
     * Get multiple thumbnails from cache
     */
    getMultiple(vectorSetName: string, elementIds: string[]): Record<string, string | null> {
        const results: Record<string, string | null> = {}

        for (const elementId of elementIds) {
            const cached = this.get(vectorSetName, elementId)
            // Include both successful results and cached null results (meaning thumbnail doesn't exist)
            if (this.has(vectorSetName, elementId)) {
                results[elementId] = cached
            }
        }

        return results
    }

    /**
     * Check if a thumbnail is cached (regardless of whether it's null or has data)
     */
    has(vectorSetName: string, elementId: string): boolean {
        if (!this.isBrowser()) {
            return false
        }

        try {
            const key = this.generateCacheKey(vectorSetName, elementId)
            const cached = localStorage.getItem(key)

            if (!cached) {
                return false
            }

            const parsedCache: CachedThumbnail = JSON.parse(cached)

            // Check if expired
            if (Date.now() - parsedCache.timestamp > this.CACHE_EXPIRY_MS) {
                localStorage.removeItem(key)
                return false
            }

            return true
        } catch {
            return false
        }
    }

    /**
     * Set multiple thumbnails in cache
     */
    setMultiple(vectorSetName: string, thumbnails: Record<string, string | null>): void {
        for (const [elementId, data] of Object.entries(thumbnails)) {
            this.set(vectorSetName, elementId, data)
        }
    }

    /**
     * Remove thumbnail from cache
     */
    remove(vectorSetName: string, elementId: string): void {
        if (!this.isBrowser()) {
            return
        }

        try {
            const key = this.generateCacheKey(vectorSetName, elementId)
            localStorage.removeItem(key)
        } catch (error) {
            console.warn('Error removing from thumbnail cache:', error)
        }
    }

    /**
     * Clear all thumbnails for a vector set
     */
    clearVectorSet(vectorSetName: string): void {
        if (!this.isBrowser()) {
            return
        }

        try {
            const keysToRemove: string[] = []

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key && key.startsWith(`${this.CACHE_PREFIX}${vectorSetName}:`)) {
                    keysToRemove.push(key)
                }
            }

            keysToRemove.forEach(key => localStorage.removeItem(key))
        } catch (error) {
            console.warn('Error clearing vector set cache:', error)
        }
    }

    /**
     * Clear entire cache
     */
    clear(): void {
        if (!this.isBrowser()) {
            this.hits = 0
            this.misses = 0
            return
        }

        try {
            const keysToRemove: string[] = []

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key && key.startsWith(this.CACHE_PREFIX)) {
                    keysToRemove.push(key)
                }
            }

            keysToRemove.forEach(key => localStorage.removeItem(key))
            this.hits = 0
            this.misses = 0
        } catch (error) {
            console.warn('Error clearing thumbnail cache:', error)
        }
    }

    /**
     * Clean up expired cache entries
     */
    private cleanupExpired(): void {
        if (!this.isBrowser()) {
            return
        }

        try {
            const keysToRemove: string[] = []
            const now = Date.now()

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key && key.startsWith(this.CACHE_PREFIX)) {
                    try {
                        const cached = localStorage.getItem(key)
                        if (cached) {
                            const parsedCache: CachedThumbnail = JSON.parse(cached)
                            if (now - parsedCache.timestamp > this.CACHE_EXPIRY_MS) {
                                keysToRemove.push(key)
                            }
                        }
                    } catch {
                        // If we can't parse it, remove it
                        keysToRemove.push(key)
                    }
                }
            }

            keysToRemove.forEach(key => localStorage.removeItem(key))
        } catch (error) {
            console.warn('Error cleaning up expired cache:', error)
        }
    }

    /**
     * Evict oldest cache entries when cache is full
     */
    private evictOldest(): void {
        if (!this.isBrowser()) {
            return
        }

        try {
            const cacheItems: { key: string; timestamp: number }[] = []

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key && key.startsWith(this.CACHE_PREFIX)) {
                    try {
                        const cached = localStorage.getItem(key)
                        if (cached) {
                            const parsedCache: CachedThumbnail = JSON.parse(cached)
                            cacheItems.push({ key, timestamp: parsedCache.timestamp })
                        }
                    } catch {
                        // If we can't parse it, we'll remove it anyway
                        cacheItems.push({ key, timestamp: 0 })
                    }
                }
            }

            // Sort by timestamp and remove oldest 25%
            cacheItems.sort((a, b) => a.timestamp - b.timestamp)
            const itemsToRemove = Math.ceil(cacheItems.length * 0.25)

            for (let i = 0; i < itemsToRemove; i++) {
                localStorage.removeItem(cacheItems[i].key)
            }
        } catch (error) {
            console.warn('Error evicting old cache entries:', error)
        }
    }

    /**
     * Get current cache size in bytes (approximate)
     */
    private getCurrentCacheSize(): number {
        if (!this.isBrowser()) {
            return 0
        }

        try {
            let totalSize = 0

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key && key.startsWith(this.CACHE_PREFIX)) {
                    const value = localStorage.getItem(key)
                    if (value) {
                        totalSize += key.length + value.length
                    }
                }
            }

            return totalSize * 2 // Rough estimate for UTF-16 encoding
        } catch (error) {
            console.warn('Error calculating cache size:', error)
            return 0
        }
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        const totalRequests = this.hits + this.misses
        return {
            totalItems: this.getCacheItemCount(),
            totalSize: this.getCurrentCacheSize(),
            hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
            missRate: totalRequests > 0 ? this.misses / totalRequests : 0
        }
    }

    /**
     * Get number of cached items
     */
    private getCacheItemCount(): number {
        if (!this.isBrowser()) {
            return 0
        }

        try {
            let count = 0
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key && key.startsWith(this.CACHE_PREFIX)) {
                    count++
                }
            }
            return count
        } catch (error) {
            console.warn('Error counting cache items:', error)
            return 0
        }
    }
}

// Export singleton instance
export const thumbnailCache = ThumbnailCache.getInstance()
