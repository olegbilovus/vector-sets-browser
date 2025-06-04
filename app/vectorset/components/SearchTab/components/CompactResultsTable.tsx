import React from "react"
import { Table, TableBody } from "@/components/ui/table"
import { VectorTuple } from "@/lib/redis-server/api"
import { ColumnConfig } from "@/app/vectorset/hooks/useVectorResultsSettings"
import { FilterField, SortColumn, SortDirection } from "../types"
import ResultsTableHeader from "./ResultsTableHeader"
import CompactResultRow from "./CompactResultRow"
import { VectorSetMetadata } from "@/lib/types/vectors"
import { useThumbnailPreloader } from "@/components/ThumbnailDisplay/ThumbnailProvider"
import { isImageEmbedding, isMultiModalEmbedding } from "@/lib/embeddings/types/embeddingModels"

export interface CompactResultsTableProps {
    filteredAndSortedResults: VectorTuple[]
    availableColumns: ColumnConfig[]
    filterFields: FilterField[]
    parsedAttributeCache: Record<string, Record<string, any>>
    sortColumn: SortColumn
    sortDirection: SortDirection
    handleSort: (column: SortColumn) => void
    selectMode: boolean
    selectedElements: Set<string>
    handleSelectToggle: (element: string) => void
    handleSelectAll: () => void
    handleDeselectAll: () => void
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
}

const CompactResultsTable = React.memo(function CompactResultsTable({
    filteredAndSortedResults,
    availableColumns,
    filterFields,
    parsedAttributeCache,
    sortColumn,
    sortDirection,
    handleSort,
    selectMode,
    selectedElements,
    handleSelectToggle,
    handleSelectAll,
    handleDeselectAll,
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
    lastSearchDisplayName
}: CompactResultsTableProps) {
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
        <Table>
            <ResultsTableHeader 
                availableColumns={availableColumns}
                filterFields={filterFields}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                handleSort={handleSort}
                selectMode={selectMode}
                selectedElements={selectedElements}
                handleSelectAll={handleSelectAll}
                handleDeselectAll={handleDeselectAll}
                filteredAndSortedResults={filteredAndSortedResults}
            />
            <TableBody>
                {filteredAndSortedResults.map((row, index) => (
                    <CompactResultRow 
                        key={`${row[0]}-${index}`}
                        row={row}
                        index={index}
                        availableColumns={availableColumns}
                        parsedAttributeCache={parsedAttributeCache}
                        selectMode={selectMode}
                        selectedElements={selectedElements}
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
                    />
                ))}
            </TableBody>
        </Table>
    )
})

export default CompactResultsTable 