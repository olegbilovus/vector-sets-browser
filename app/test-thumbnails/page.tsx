"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ThumbnailDisplay from '@/components/ThumbnailDisplay/ThumbnailDisplay'
import { useThumbnails, useThumbnailContext } from '@/components/ThumbnailDisplay/ThumbnailProvider'

export default function TestThumbnailsPage() {
    const [vectorSetName, setVectorSetName] = useState('')
    const [elementIds, setElementIds] = useState('')
    const [singleElementId, setSingleElementId] = useState('')
    const { getCacheStats, clearCache } = useThumbnailContext()

    // Parse element IDs from comma-separated string
    const elementIdArray = elementIds.split(',').map(id => id.trim()).filter(id => id.length > 0)

    // Use the batch hook
    const { thumbnails, isLoading, error } = useThumbnails(vectorSetName, elementIdArray)

    const handleClearCache = () => {
        clearCache()
        alert('Cache cleared!')
    }

    const handleShowStats = () => {
        const stats = getCacheStats()
        alert(`Cache Stats:
Total Items: ${stats.totalItems}
Total Size: ${Math.round(stats.totalSize / 1024)} KB
Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%
Miss Rate: ${(stats.missRate * 100).toFixed(1)}%`)
    }

    return (
        <div className="container mx-auto py-8 space-y-6">
            <div className="text-center">
                <h1 className="text-3xl font-bold">Thumbnail System Test</h1>
                <p className="text-gray-600 mt-2">
                    Test the new asynchronous, batched, and cached thumbnail system
                </p>
            </div>

            {/* Cache Controls */}
            <Card>
                <CardHeader>
                    <CardTitle>Cache Controls</CardTitle>
                    <CardDescription>
                        Manage the thumbnail cache
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Button onClick={handleShowStats} variant="outline">
                            Show Cache Stats
                        </Button>
                        <Button onClick={handleClearCache} variant="destructive">
                            Clear Cache
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Single Thumbnail Test */}
            <Card>
                <CardHeader>
                    <CardTitle>Single Thumbnail Test</CardTitle>
                    <CardDescription>
                        Test loading a single thumbnail using the ThumbnailDisplay component
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Vector Set Name</label>
                            <Input
                                value={vectorSetName}
                                onChange={(e) => setVectorSetName(e.target.value)}
                                placeholder="Enter vector set name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Element ID</label>
                            <Input
                                value={singleElementId}
                                onChange={(e) => setSingleElementId(e.target.value)}
                                placeholder="Enter element ID"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div>
                            <p className="text-sm font-medium mb-2">Small:</p>
                            <ThumbnailDisplay
                                vectorSetName={vectorSetName}
                                elementId={singleElementId}
                                size="small"
                            />
                        </div>
                        <div>
                            <p className="text-sm font-medium mb-2">Medium:</p>
                            <ThumbnailDisplay
                                vectorSetName={vectorSetName}
                                elementId={singleElementId}
                                size="medium"
                            />
                        </div>
                        <div>
                            <p className="text-sm font-medium mb-2">Large:</p>
                            <ThumbnailDisplay
                                vectorSetName={vectorSetName}
                                elementId={singleElementId}
                                size="large"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Batch Thumbnail Test */}
            <Card>
                <CardHeader>
                    <CardTitle>Batch Thumbnail Test</CardTitle>
                    <CardDescription>
                        Test loading multiple thumbnails using the useThumbnails hook
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Element IDs (comma-separated)
                        </label>
                        <Input
                            value={elementIds}
                            onChange={(e) => setElementIds(e.target.value)}
                            placeholder="image1,image2,image3"
                        />
                    </div>

                    {isLoading && (
                        <div className="text-blue-600">Loading thumbnails...</div>
                    )}

                    {error && (
                        <div className="text-red-600">Error: {error}</div>
                    )}

                    <div className="grid grid-cols-4 gap-4">
                        {elementIdArray.map(elementId => (
                            <div key={elementId} className="text-center">
                                <p className="text-sm font-medium mb-2">{elementId}</p>
                                <div className="flex justify-center">
                                    {thumbnails[elementId] ? (
                                        <img
                                            src={thumbnails[elementId]!}
                                            alt={`Thumbnail for ${elementId}`}
                                            className="w-16 h-16 object-cover rounded border"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 bg-gray-200 rounded border flex items-center justify-center text-gray-500 text-xs">
                                            No Image
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {thumbnails[elementId] ? 'Loaded' : 'Not found'}
                                </p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Performance Info */}
            <Card>
                <CardHeader>
                    <CardTitle>Performance Notes</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                        <li>Thumbnails are cached in localStorage for 24 hours</li>
                        <li>Requests are batched and debounced (50ms delay)</li>
                        <li>Maximum 50 thumbnails per batch request</li>
                        <li>Cache size is limited to 50MB with automatic cleanup</li>
                        <li>Failed requests don't block other thumbnails</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    )
}
