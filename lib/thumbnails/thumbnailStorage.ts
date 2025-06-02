/**
 * Redis storage operations for image thumbnails
 */

import { thumbnailSet, thumbnailGet, thumbnailDelete } from '@/lib/redis-server/api'
import { generateThumbnailKey, extractBase64FromDataUrl } from './thumbnailUtils'

export interface ThumbnailStorageResult {
    success: boolean
    error?: string
}

export interface ThumbnailRetrievalResult {
    success: boolean
    thumbnail?: string // base64 data URL
    error?: string
}

/**
 * Store a thumbnail in Redis
 */
export async function storeThumbnail(
    vectorSetName: string,
    elementId: string,
    thumbnailDataUrl: string
): Promise<ThumbnailStorageResult> {
    try {
        const key = generateThumbnailKey(vectorSetName, elementId)
        const base64Data = extractBase64FromDataUrl(thumbnailDataUrl)

        const response = await thumbnailSet({
            key,
            data: base64Data,
            mimeType: getThumbnailMimeType(thumbnailDataUrl)
        })

        if (response.success) {
            return { success: true }
        } else {
            return { success: false, error: response.error || 'Failed to store thumbnail' }
        }
    } catch (error) {
        console.error('Error storing thumbnail:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error storing thumbnail'
        }
    }
}

/**
 * Retrieve a thumbnail from Redis
 */
export async function retrieveThumbnail(
    vectorSetName: string,
    elementId: string
): Promise<ThumbnailRetrievalResult> {
    try {
        const key = generateThumbnailKey(vectorSetName, elementId)

        const response = await thumbnailGet(key)

        if (response.success && response.data) {
            const { data: base64Data, mimeType } = response.data
            const dataUrl = `data:${mimeType};base64,${base64Data}`
            return { success: true, thumbnail: dataUrl }
        } else {
            // Distinguish between "not found" (normal) and actual errors
            const errorMsg = response.error || 'Thumbnail not found'
            return { success: false, error: errorMsg }
        }
    } catch (error) {
        // Since we handle 404s gracefully in the API layer, any error here is unexpected
        console.error('Error retrieving thumbnail:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error retrieving thumbnail'
        }
    }
}

/**
 * Delete a thumbnail from Redis
 */
export async function deleteThumbnail(
    vectorSetName: string,
    elementId: string
): Promise<ThumbnailStorageResult> {
    try {
        const key = generateThumbnailKey(vectorSetName, elementId)

        const response = await thumbnailDelete({ key })

        if (response.success) {
            return { success: true }
        } else {
            return { success: false, error: response.error || 'Failed to delete thumbnail' }
        }
    } catch (error) {
        console.error('Error deleting thumbnail:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error deleting thumbnail'
        }
    }
}

/**
 * Batch retrieve thumbnails for multiple elements
 */
export async function retrieveThumbnailsBatch(
    vectorSetName: string,
    elementIds: string[]
): Promise<Record<string, string | null>> {
    const results: Record<string, string | null> = {}
    
    // Process in parallel but limit concurrency to avoid overwhelming the server
    const batchSize = 10
    for (let i = 0; i < elementIds.length; i += batchSize) {
        const batch = elementIds.slice(i, i + batchSize)
        const promises = batch.map(async (elementId) => {
            const result = await retrieveThumbnail(vectorSetName, elementId)
            return { elementId, thumbnail: result.success ? result.thumbnail || null : null }
        })
        
        const batchResults = await Promise.all(promises)
        batchResults.forEach(({ elementId, thumbnail }) => {
            results[elementId] = thumbnail
        })
    }
    
    return results
}

/**
 * Extract MIME type from data URL
 */
function getThumbnailMimeType(dataUrl: string): string {
    const match = dataUrl.match(/^data:([^;]+);base64,/)
    return match ? match[1] : 'image/jpeg'
}

/**
 * Check if a thumbnail exists for a given element
 */
export async function thumbnailExists(
    vectorSetName: string,
    elementId: string
): Promise<boolean> {
    try {
        const result = await retrieveThumbnail(vectorSetName, elementId)
        return result.success
    } catch {
        return false
    }
}

/**
 * Get thumbnail storage statistics for a vector set
 */
export async function getThumbnailStats(_vectorSetName: string): Promise<{
    totalThumbnails: number
    totalSize: number
}> {
    try {
        // For now, return basic stats - this could be enhanced with a dedicated API endpoint
        return { totalThumbnails: 0, totalSize: 0 }
    } catch (error) {
        console.error('Error getting thumbnail stats:', error)
        return { totalThumbnails: 0, totalSize: 0 }
    }
}
