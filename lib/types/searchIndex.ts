// A single field/attribute in a RediSearch (FT) index schema.
export interface FtField {
    identifier: string // source path, e.g. "$.text" (JSON) or field name (HASH)
    attribute: string // alias used in queries and RETURN
    type: string // TEXT | TAG | NUMERIC | VECTOR | GEO | ...
    // VECTOR-only:
    algorithm?: string // FLAT | HNSW
    dataType?: string // FLOAT32 | FLOAT64 | ...
    dim?: number
    distanceMetric?: string // COSINE | L2 | IP
}

// Parsed FT.INFO for one index.
export interface FtIndexInfo {
    name: string
    keyType: string // HASH | JSON
    prefixes: string[]
    numDocs: number
    fields: FtField[]
    vectorField?: FtField // first VECTOR field, if any
}

export interface SearchIndexHit {
    id: string
    score: number // raw KNN distance (lower = closer)
    similarity: number | null // 1 - distance for COSINE, else null
    fields: Record<string, string>
    vector?: number[] // present when the search was asked to return vectors
}

export interface SearchIndexSearchResult {
    total: number
    hits: SearchIndexHit[]
}

export interface SearchIndexSearchRequest {
    vector: number[]
    vectorField: string
    count?: number
    filter?: string // raw RediSearch filter expr, e.g. "@release:{zurich}"
    returnFields?: string[] // non-vector attributes to fetch
    distanceMetric?: string
    returnVector?: boolean // also return the stored vector for each hit (for viz)
}
