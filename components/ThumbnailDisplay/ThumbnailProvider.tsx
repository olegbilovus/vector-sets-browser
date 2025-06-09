/**
 * React context provider for thumbnail management
 */

import React, { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { thumbnailService } from '@/services/thumbnails/thumbnailService'

interface ThumbnailContextValue {
    getThumbnail: (vectorSetName: string, elementId: string) => Promise<string | null>
    getThumbnails: (vectorSetName: string, elementIds: string[]) => Promise<Record<string, string | null>>
    preloadThumbnails: (vectorSetName: string, elementIds: string[]) => Promise<void>
    clearVectorSetCache: (vectorSetName: string) => void
    clearCache: () => void
    getCacheStats: () => any
}

const ThumbnailContext = createContext<ThumbnailContextValue | null>(null)

interface ThumbnailProviderProps {
    children: React.ReactNode
}

export function ThumbnailProvider({ children }: ThumbnailProviderProps) {
    const getThumbnail = useCallback(async (vectorSetName: string, elementId: string) => {
        return thumbnailService.getThumbnail(vectorSetName, elementId)
    }, [])

    const getThumbnails = useCallback(async (vectorSetName: string, elementIds: string[]) => {
        return thumbnailService.getThumbnails(vectorSetName, elementIds)
    }, [])

    const preloadThumbnails = useCallback(async (vectorSetName: string, elementIds: string[]) => {
        return thumbnailService.preloadThumbnails(vectorSetName, elementIds)
    }, [])

    const clearVectorSetCache = useCallback((vectorSetName: string) => {
        thumbnailService.clearVectorSetCache(vectorSetName)
    }, [])

    const clearCache = useCallback(() => {
        thumbnailService.clearCache()
    }, [])

    const getCacheStats = useCallback(() => {
        return thumbnailService.getCacheStats()
    }, [])

    const value: ThumbnailContextValue = {
        getThumbnail,
        getThumbnails,
        preloadThumbnails,
        clearVectorSetCache,
        clearCache,
        getCacheStats
    }

    return (
        <ThumbnailContext.Provider value={value}>
            {children}
        </ThumbnailContext.Provider>
    )
}

export function useThumbnailContext(): ThumbnailContextValue {
    const context = useContext(ThumbnailContext)
    if (!context) {
        throw new Error('useThumbnailContext must be used within a ThumbnailProvider')
    }
    return context
}

/**
 * Hook for loading a single thumbnail
 */
export function useThumbnail(vectorSetName: string, elementId: string) {
    const { getThumbnail } = useThumbnailContext()
    const [thumbnail, setThumbnail] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!vectorSetName || !elementId) {
            setThumbnail(null)
            setIsLoading(false)
            setError(null)
            return
        }

        let isMounted = true
        setIsLoading(true)
        setError(null)

        getThumbnail(vectorSetName, elementId)
            .then(result => {
                if (isMounted) {
                    setThumbnail(result)
                    setIsLoading(false)
                }
            })
            .catch(err => {
                if (isMounted) {
                    setError(err instanceof Error ? err.message : 'Failed to load thumbnail')
                    setThumbnail(null)
                    setIsLoading(false)
                }
            })

        return () => {
            isMounted = false
        }
    }, [vectorSetName, elementId, getThumbnail])

    return { thumbnail, isLoading, error }
}

/**
 * Hook for loading multiple thumbnails
 */
export function useThumbnails(vectorSetName: string, elementIds: string[]) {
    const { getThumbnails } = useThumbnailContext()
    const [thumbnails, setThumbnails] = useState<Record<string, string | null>>({})
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Create a stable key for the elementIds array
    const elementIdsKey = elementIds.sort().join(',')

    useEffect(() => {
        if (!vectorSetName || elementIds.length === 0) {
            setThumbnails({})
            setIsLoading(false)
            setError(null)
            return
        }

        let isMounted = true
        setIsLoading(true)
        setError(null)

        getThumbnails(vectorSetName, elementIds)
            .then(result => {
                if (isMounted) {
                    setThumbnails(result)
                    setIsLoading(false)
                }
            })
            .catch(err => {
                if (isMounted) {
                    setError(err instanceof Error ? err.message : 'Failed to load thumbnails')
                    setThumbnails({})
                    setIsLoading(false)
                }
            })

        return () => {
            isMounted = false
        }
    }, [vectorSetName, elementIdsKey, getThumbnails])

    return { thumbnails, isLoading, error }
}

/**
 * Hook for preloading thumbnails (fire and forget)
 */
export function useThumbnailPreloader() {
    const { preloadThumbnails } = useThumbnailContext()

    const preload = useCallback((vectorSetName: string, elementIds: string[]) => {
        if (vectorSetName && elementIds.length > 0) {
            preloadThumbnails(vectorSetName, elementIds).catch(error => {
                console.warn('Failed to preload thumbnails:', error)
            })
        }
    }, [preloadThumbnails])

    return { preload }
}
