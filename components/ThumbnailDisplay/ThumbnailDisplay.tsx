import React, { useState, useEffect } from 'react'
import { retrieveThumbnail } from '@/lib/thumbnails/thumbnailStorage'
import { ImageOff } from 'lucide-react'
import eventBus, { AppEvents } from '@/lib/client/events/eventEmitter'

interface ThumbnailDisplayProps {
    vectorSetName: string
    elementId: string
    size?: 'small' | 'medium' | 'large'
    className?: string
    showFallback?: boolean
    onError?: (error: string) => void
}

const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12', 
    large: 'w-16 h-16'
}

const iconSizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8'
}

function ThumbnailDisplayCore({
    vectorSetName,
    elementId,
    size = 'medium',
    className = '',
    showFallback = true,
    onError
}: ThumbnailDisplayProps) {
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false) // Start as false to avoid initial flicker
    const [hasError, setHasError] = useState(false)

    useEffect(() => {
        // Don't attempt to load if we don't have the required parameters
        if (!vectorSetName || !elementId) {
            setHasError(true)
            setIsLoading(false)
            return
        }

        let isMounted = true

        const loadThumbnail = async () => {
            try {
                setIsLoading(true)
                setHasError(false)

                const result = await retrieveThumbnail(vectorSetName, elementId)

                if (!isMounted) return

                if (result.success && result.thumbnail) {
                    setThumbnailUrl(result.thumbnail)
                } else {
                    // Not finding a thumbnail is not an error - it's expected for many vectors
                    setHasError(true)
                    // Only call onError for actual errors, not for missing thumbnails
                    if (onError && result.error && !result.error.includes('not found')) {
                        onError(result.error)
                    }
                }
            } catch (error) {
                if (!isMounted) return

                setHasError(true)
                // Only report actual errors, not network errors for missing thumbnails
                const errorMessage = error instanceof Error ? error.message : 'Failed to load thumbnail'
                if (onError && !errorMessage.includes('404') && !errorMessage.includes('not found')) {
                    onError(errorMessage)
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        // Initial load
        loadThumbnail()

        // Listen for thumbnail generation events
        const unsubscribe = eventBus.on(AppEvents.THUMBNAIL_GENERATED, (data: {
            vectorSetName: string;
            elementId: string;
            thumbnailUrl: string;
        }) => {
            // If this event is for our specific thumbnail, refresh it
            if (data.vectorSetName === vectorSetName && data.elementId === elementId) {
                loadThumbnail()
            }
        })

        return () => {
            isMounted = false
            unsubscribe()
        }
    }, [vectorSetName, elementId, onError])

    const baseClasses = `${sizeClasses[size]} rounded overflow-hidden flex items-center justify-center ${className}`

    // Loading state
    if (isLoading) {
        return (
            <div className={`${baseClasses} bg-gray-100 animate-pulse`}>
                <div className={`${iconSizeClasses[size]} bg-gray-300 rounded`} />
            </div>
        )
    }

    // Error state or no thumbnail
    if (hasError || !thumbnailUrl) {
        if (!showFallback) {
            return null
        }
        
        return (
            <div className={`${baseClasses} bg-gray-100 text-gray-400`}>
                <ImageOff className={iconSizeClasses[size]} />
            </div>
        )
    }

    // Success state - show thumbnail
    return (
        <div className={`${baseClasses} bg-gray-100`}>
            <img
                src={thumbnailUrl}
                alt={`Thumbnail for ${elementId}`}
                className="w-full h-full object-cover"
                onError={() => {
                    setHasError(true)
                    setThumbnailUrl(null)
                }}
            />
        </div>
    )
}

// Hook for batch loading thumbnails
export function useThumbnailBatch(vectorSetName: string, elementIds: string[]) {
    const [thumbnails, setThumbnails] = useState<Record<string, string | null>>({})
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (elementIds.length === 0) {
            setThumbnails({})
            return
        }

        let isMounted = true

        const loadThumbnails = async () => {
            try {
                setIsLoading(true)
                setError(null)

                // Load thumbnails in batches to avoid overwhelming the server
                const batchSize = 10
                const results: Record<string, string | null> = {}

                for (let i = 0; i < elementIds.length; i += batchSize) {
                    const batch = elementIds.slice(i, i + batchSize)
                    const promises = batch.map(async (elementId) => {
                        try {
                            const result = await retrieveThumbnail(vectorSetName, elementId)
                            return {
                                elementId,
                                thumbnail: result.success ? result.thumbnail || null : null
                            }
                        } catch {
                            return { elementId, thumbnail: null }
                        }
                    })

                    const batchResults = await Promise.all(promises)
                    batchResults.forEach(({ elementId, thumbnail }) => {
                        results[elementId] = thumbnail
                    })

                    if (!isMounted) return
                }

                if (isMounted) {
                    setThumbnails(results)
                }
            } catch (error) {
                if (isMounted) {
                    setError(error instanceof Error ? error.message : 'Failed to load thumbnails')
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        loadThumbnails()

        return () => {
            isMounted = false
        }
    }, [vectorSetName, elementIds])

    return { thumbnails, isLoading, error }
}

// Main export with validation
export default function ThumbnailDisplay(props: ThumbnailDisplayProps) {
    // Don't render anything if we don't have the required props
    if (!props.vectorSetName || !props.elementId) {
        return null
    }

    return <ThumbnailDisplayCore {...props} />
}
