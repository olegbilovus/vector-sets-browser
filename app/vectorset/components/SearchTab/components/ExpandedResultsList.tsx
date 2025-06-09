import React from "react"
import { VectorTuple } from "@/services/redis-server/api"
import { VectorSetMetadata } from "@/lib/types/vectors"
import ExpandedResultRow from "./ExpandedResultRow"
import { useThumbnailPreloader } from "@/components/ThumbnailDisplay/ThumbnailProvider"
import { isImageEmbedding, isMultiModalEmbedding } from "@/services/embeddings/types/embeddingModels"

interface ExpandedResultsListProps {
    filteredAndSortedResults: VectorTuple[]
    selectMode: boolean
    selectedElements: Set<string>
    showAttributes: boolean
    showOnlyFilteredAttributes: boolean
    isLoadingAttributes: boolean
    attributeCache: Record<string, string | null>
    parsedAttributeCache: Record<string, Record<string, any>>
    filteredFields: string[]
    filteredFieldValues: Record<string, Record<string, string>>
    handleSelectToggle: (element: string) => void
    handleSearchSimilar: (element: string) => void
    onShowVectorClick: (e: React.MouseEvent, element: string) => void
    setEditingAttributes: (element: string) => void
    onDeleteClick: (e: React.MouseEvent, element: string) => void
    metadata?: VectorSetMetadata | null
    vectorSetName?: string | null
    showEmbeddings?: boolean
    embeddingsCache?: Record<string, number[] | null>
    isLoadingEmbeddings?: boolean
    searchVector?: number[] | null
    searchQuery?: string | null
    lastSearchDisplayName?: string | null
    isZeroVectorSearch?: boolean
}

export default function ExpandedResultsList({
    filteredAndSortedResults,
    selectMode,
    selectedElements,
    showAttributes,
    showOnlyFilteredAttributes,
    isLoadingAttributes,
    attributeCache,
    parsedAttributeCache,
    filteredFields,
    filteredFieldValues,
    handleSelectToggle,
    handleSearchSimilar,
    onShowVectorClick,
    setEditingAttributes,
    onDeleteClick,
    metadata,
    vectorSetName,
    showEmbeddings,
    embeddingsCache,
    isLoadingEmbeddings,
    searchVector,
    searchQuery,
    lastSearchDisplayName,
    isZeroVectorSearch
}: ExpandedResultsListProps) {
    const { preload } = useThumbnailPreloader()

    // Preload thumbnails for image/multimodal vector sets
    React.useEffect(() => {
        if (vectorSetName && metadata?.embedding &&
            (isImageEmbedding(metadata.embedding) || isMultiModalEmbedding(metadata.embedding))) {
            const elementIds = filteredAndSortedResults.map(row => row[0])
            if (elementIds.length > 0) {
                preload(vectorSetName, elementIds)
            }
        }
    }, [vectorSetName, metadata, filteredAndSortedResults, preload])
    return (
        <div className="space-y-4 mb-8">
            {filteredAndSortedResults.map((row, index) => (
                <ExpandedResultRow
                    key={index}
                    row={row}
                    index={index}
                    selectMode={selectMode}
                    selectedElements={selectedElements}
                    showAttributes={showAttributes}
                    showOnlyFilteredAttributes={showOnlyFilteredAttributes}
                    isLoadingAttributes={isLoadingAttributes}
                    attributeCache={attributeCache}
                    parsedAttributeCache={parsedAttributeCache}
                    filteredFields={filteredFields}
                    filteredFieldValues={filteredFieldValues}
                    handleSelectToggle={handleSelectToggle}
                    handleSearchSimilar={handleSearchSimilar}
                    onShowVectorClick={onShowVectorClick}
                    setEditingAttributes={setEditingAttributes}
                    onDeleteClick={onDeleteClick}
                    metadata={metadata}
                    vectorSetName={vectorSetName}
                    showEmbeddings={showEmbeddings}
                    embeddingsCache={embeddingsCache}
                    isLoadingEmbeddings={isLoadingEmbeddings}
                    searchVector={searchVector}
                    searchQuery={searchQuery}
                    lastSearchDisplayName={lastSearchDisplayName}
                    isZeroVectorSearch={isZeroVectorSearch}
                />
            ))}
        </div>
    )
} 