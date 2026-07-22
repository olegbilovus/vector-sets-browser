import { apiClient } from "@/services/client"
import { FtIndexInfo, SearchIndexSearchResult } from "@/lib/types/searchIndex"

export interface SearchIndexListResult {
    available: boolean
    indexes: string[]
}

export interface SearchIndexSearchParams {
    vector: number[]
    vectorField: string
    count?: number
    filter?: string
    returnFields?: string[]
    distanceMetric?: string
    returnVector?: boolean
}

export const searchIndexes = {
    async list(): Promise<SearchIndexListResult> {
        const res = await apiClient.get<SearchIndexListResult>("/api/search-index")
        return res.result || { available: false, indexes: [] }
    },

    async info(name: string): Promise<FtIndexInfo | null> {
        const res = await apiClient.get<FtIndexInfo>(
            `/api/search-index/${encodeURIComponent(name)}`
        )
        return res.result || null
    },

    async search(
        name: string,
        params: SearchIndexSearchParams
    ): Promise<SearchIndexSearchResult> {
        const res = await apiClient.post<
            SearchIndexSearchResult,
            SearchIndexSearchParams
        >(`/api/search-index/${encodeURIComponent(name)}/search`, params)
        return res.result || { total: 0, hits: [] }
    },
}
