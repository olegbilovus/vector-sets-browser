"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { searchIndexes } from "@/services/search-indexes"
import { embeddings } from "@/services/embeddings/client"
import EditEmbeddingConfigModal from "@/components/EmbeddingConfig/EditEmbeddingConfigDialog"
import VectorViz3D from "../VisualizationTab/VectorViz3D"
import HNSW2dViz from "../VisualizationTab/vizualizer/HNSW2dViz"
import VectorVisualizationRenderer from "@/components/VectorVisualizationRenderer"
import VectorHeatmap from "@/components/VectorHeatmap"
import { FtIndexInfo, SearchIndexHit } from "@/lib/types/searchIndex"
import { EmbeddingConfig, getModelData } from "@/services/embeddings/types/embeddingModels"
import { userSettings } from "@/lib/storage/userSettings"

interface SearchIndexViewProps {
    indexName: string
}

// The chosen embedding model per index is kept in the browser only — the
// RediSearch path never writes to Redis (the neighbor graph is always
// recomputed live via KNN, never persisted).
const embeddingKey = (indexName: string) => `search-index-embedding:${indexName}`
const vectorFieldKey = (indexName: string) => `search-index-vectorfield:${indexName}`
const displayKey = (indexName: string) => `search-index-display:${indexName}`

type VizType = "heatmap" | "distribution" | "radial" | "surface"
const VIZ_TYPES: VizType[] = ["heatmap", "distribution", "radial", "surface"]

// Neighbours fetched per node expansion in the 2D graph. Each hit carries a
// full vector, so this bounds the payload; the graph grows by expanding nodes.
const NEIGHBOR_FANOUT = 12
// Total nodes the 2D graph may hold.
const MAX_GRAPH_NODES = 100

// Common names we *guess* for a row's heading / link / snippet. These are only
// defaults — the user can remap them per index (schemas vary widely).
const TITLE_FIELDS = ["title", "name", "heading", "label", "subject"]
const URL_FIELDS = ["url", "canonical_url", "link", "href", "uri"]
const SNIPPET_FIELDS = ["text", "description", "content", "body", "chunk", "summary"]

// Which schema field fills which display role. "" means "don't show".
interface DisplayConfig {
    titleField: string
    urlField: string
    snippetField: string
    showAll: boolean
}

const NONE = ""

function firstPresent(candidates: string[], available: string[]): string | undefined {
    return candidates.find((c) => available.includes(c))
}

// Sensible defaults derived from the index's actual attributes.
function detectDisplay(available: string[]): DisplayConfig {
    const titleField = firstPresent(TITLE_FIELDS, available) ?? available[0] ?? NONE
    const urlField = firstPresent(URL_FIELDS, available) ?? NONE
    const snippetField =
        firstPresent(
            SNIPPET_FIELDS.filter((f) => f !== titleField),
            available
        ) ??
        available.find((a) => a !== titleField && a !== urlField) ??
        NONE
    return { titleField, urlField, snippetField, showAll: false }
}

export default function SearchIndexView({ indexName }: SearchIndexViewProps) {
    const [info, setInfo] = useState<FtIndexInfo | null>(null)
    const [embedding, setEmbedding] = useState<EmbeddingConfig | undefined>(undefined)
    const [vectorFieldName, setVectorFieldName] = useState<string | undefined>(undefined)
    const [display, setDisplay] = useState<DisplayConfig | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)

    const [query, setQuery] = useState("")
    const [count, setCount] = useState("10")
    const [filter, setFilter] = useState("")
    const [hits, setHits] = useState<SearchIndexHit[]>([])
    const [total, setTotal] = useState<number | null>(null)
    const [searching, setSearching] = useState(false)
    const [searchError, setSearchError] = useState<string | null>(null)
    const [searchTime, setSearchTime] = useState<number | null>(null)
    const [resultsTab, setResultsTab] = useState("table")
    const [vizType, setVizType] = useState<VizType>("heatmap")
    // Result whose full-screen vector viz dialog is open, plus the query vector
    // (enables the query-vs-result comparison view, like the vector-set view).
    const [expanded, setExpanded] = useState<{ vector: number[]; name: string } | null>(null)
    const [lastQueryVector, setLastQueryVector] = useState<number[] | null>(null)
    const [lastQuery, setLastQuery] = useState<string>("")

    const [isConfigOpen, setIsConfigOpen] = useState(false)

    // Cache of element -> vector, grown as results/neighbors arrive. Lets the
    // 2D graph expand any node with an on-the-fly KNN query (our VLINKS stand-in).
    const elementVectors = useRef<Map<string, number[]>>(new Map())

    // All VECTOR fields in the schema, and the one currently selected (defaults
    // to the first / auto-detected field).
    const vectorFields = useMemo(
        () => (info?.fields || []).filter((f) => f.type === "VECTOR"),
        [info]
    )
    const vectorField = useMemo(
        () =>
            vectorFields.find((f) => f.attribute === vectorFieldName) ||
            vectorFields[0],
        [vectorFields, vectorFieldName]
    )
    const hasEmbedding = !!embedding && embedding.provider !== "none"

    const returnFields = useMemo(
        () =>
            (info?.fields || [])
                .filter((f) => f.type !== "VECTOR")
                .map((f) => f.attribute),
        [info]
    )

    const load = useCallback(async () => {
        setLoading(true)
        setLoadError(null)
        setHits([])
        setTotal(null)
        setSearchError(null)
        try {
            const i = await searchIndexes.info(indexName)
            setInfo(i)
            // Embedding-model choice + selected vector field live in the browser
            // only (no Redis write).
            setEmbedding(
                userSettings.get<EmbeddingConfig>(embeddingKey(indexName)) ||
                    undefined
            )
            const savedField = userSettings.get<string>(vectorFieldKey(indexName))
            const vfields = (i?.fields || []).filter((f) => f.type === "VECTOR")
            const validSaved =
                savedField && vfields.some((f) => f.attribute === savedField)
            setVectorFieldName(
                validSaved ? savedField! : i?.vectorField?.attribute
            )

            // Display-field mapping: saved override, else guess from the schema.
            const attrs = (i?.fields || [])
                .filter((f) => f.type !== "VECTOR")
                .map((f) => f.attribute)
            const savedDisplay = userSettings.get<DisplayConfig>(displayKey(indexName))
            setDisplay(
                savedDisplay
                    ? { ...detectDisplay(attrs), ...savedDisplay }
                    : detectDisplay(attrs)
            )
        } catch (e) {
            setLoadError(e instanceof Error ? e.message : "Failed to load index")
        } finally {
            setLoading(false)
        }
    }, [indexName])

    useEffect(() => {
        load()
    }, [load])

    const saveEmbedding = useCallback(
        (config: EmbeddingConfig) => {
            userSettings.set(embeddingKey(indexName), config)
            setEmbedding(config)
        },
        [indexName]
    )

    const updateDisplay = useCallback(
        (patch: Partial<DisplayConfig>) => {
            setDisplay((prev) => {
                const next = { ...(prev as DisplayConfig), ...patch }
                userSettings.set(displayKey(indexName), next)
                return next
            })
        },
        [indexName]
    )

    const selectVectorField = useCallback(
        (name: string) => {
            userSettings.set(vectorFieldKey(indexName), name)
            setVectorFieldName(name)
            // Results were computed against the previous field; clear them.
            elementVectors.current.clear()
            setHits([])
            setTotal(null)
        },
        [indexName]
    )

    // One-click default for the common 768-dim case (matches gte-base).
    const useGteBase = useCallback(() => {
        saveEmbedding({ provider: "clip", clip: { model: "gte-base" } })
    }, [saveEmbedding])

    // Display name for a hit: the mapped Title field, else the doc key.
    const labelFor = useCallback(
        (hit: SearchIndexHit) =>
            (display?.titleField && hit.fields[display.titleField]) || hit.id,
        [display]
    )

    const rememberVectors = useCallback((hs: SearchIndexHit[]) => {
        for (const h of hs) {
            if (h.vector && h.vector.length) elementVectors.current.set(h.id, h.vector)
        }
    }, [])

    const runSearch = useCallback(async () => {
        if (!vectorField || !embedding) return
        setSearching(true)
        setSearchError(null)
        setSearchTime(null)
        const t0 = performance.now()
        try {
            const emb = await embeddings.getEmbedding(embedding, query)
            if (!emb.success || !emb.result) {
                throw new Error(emb.error || "Failed to embed query")
            }
            setLastQueryVector(emb.result)
            setLastQuery(query)
            const res = await searchIndexes.search(indexName, {
                vector: emb.result,
                vectorField: vectorField.attribute,
                count: Number(count) || 10,
                filter: filter.trim() || undefined,
                returnFields,
                distanceMetric: vectorField.distanceMetric,
                returnVector: true,
            })
            elementVectors.current.clear()
            rememberVectors(res.hits)
            setHits(res.hits)
            setTotal(res.total)
            setSearchTime(performance.now() - t0)
        } catch (e) {
            setSearchError(e instanceof Error ? e.message : "Search failed")
            setHits([])
            setTotal(null)
        } finally {
            setSearching(false)
        }
    }, [vectorField, embedding, query, count, filter, returnFields, indexName, rememberVectors])

    // Neighbor lookup for the 2D graph: KNN by the node's stored vector.
    // The viz asks for `maxNodes` neighbours, but each hit carries a full
    // vector, so we cap the fan-out per expansion to keep payloads small.
    const getNeighbors = useCallback(
        async (element: string, k: number) => {
            const vec = elementVectors.current.get(element)
            if (!vec || !vectorField) return []
            const want = Math.min(Math.max(k, 1), NEIGHBOR_FANOUT)
            const res = await searchIndexes.search(indexName, {
                vector: vec,
                vectorField: vectorField.attribute,
                count: want + 1, // may include the node itself
                returnFields,
                distanceMetric: vectorField.distanceMetric,
                returnVector: true,
            })
            rememberVectors(res.hits)
            return res.hits
                .filter((h) => h.id !== element)
                .slice(0, want)
                .map((h) => ({
                    element: h.id,
                    similarity: h.similarity ?? 1 - h.score,
                    vector: h.vector || [],
                    label: labelFor(h),
                }))
        },
        [vectorField, indexName, returnFields, rememberVectors, labelFor]
    )

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12 text-gray-500">
                Loading index…
            </div>
        )
    }

    if (loadError || !info) {
        return (
            <div className="p-4 text-red-600 bg-red-50 border border-red-200 rounded">
                {loadError || "Index not found"}
            </div>
        )
    }

    const modelName = embedding ? getModelData(embedding)?.name : undefined

    return (
        <Tabs defaultValue="search" className="w-full h-full flex flex-col">
            <TabsList className="bg-gray-200 w-full">
                <TabsTrigger className="w-full" value="search">
                    Search
                </TabsTrigger>
                <TabsTrigger className="w-full" value="schema">
                    Schema
                </TabsTrigger>
            </TabsList>

            {/* SEARCH TAB */}
            <TabsContent value="search" className="pt-4">
                {vectorFields.length > 0 && (
                    <div className="flex items-center gap-2 mb-3 text-xs">
                        <label className="text-gray-500">Vector field:</label>
                        <select
                            value={vectorField?.attribute || ""}
                            onChange={(e) => selectVectorField(e.target.value)}
                            className="border rounded px-2 py-1 text-xs bg-white"
                            title="Which VECTOR field to run KNN against"
                        >
                            {vectorFields.map((f) => (
                                <option key={f.attribute} value={f.attribute}>
                                    {f.attribute} ({f.dim}d, {f.distanceMetric})
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                {!vectorField ? (
                    <div className="p-4 text-amber-700 bg-amber-50 border border-amber-200 rounded">
                        This index has no <code>VECTOR</code> field, so KNN search
                        isn&apos;t available. See the Schema tab for its fields.
                    </div>
                ) : !hasEmbedding ? (
                    <div className="p-4 border rounded bg-gray-50 space-y-3">
                        <div className="text-sm text-gray-700">
                            Pick the embedding model that produced this
                            index&apos;s vectors (
                            <span className="font-medium">
                                {vectorField.dim}d, {vectorField.distanceMetric}
                            </span>
                            ). It must match, or results will be meaningless.
                        </div>
                        <div className="flex gap-2">
                            {vectorField.dim === 768 && (
                                <Button onClick={useGteBase} variant="default">
                                    Use gte-base (browser, 768d)
                                </Button>
                            )}
                            <Button
                                onClick={() => setIsConfigOpen(true)}
                                variant="outline"
                            >
                                Configure model…
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>
                                Model:{" "}
                                <span className="font-medium text-gray-700">
                                    {modelName || embedding?.provider}
                                </span>
                            </span>
                            <button
                                className="underline hover:text-gray-700"
                                onClick={() => setIsConfigOpen(true)}
                            >
                                change
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <Input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search query…"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") runSearch()
                                }}
                                className="flex-1"
                            />
                            <Input
                                value={count}
                                onChange={(e) => setCount(e.target.value)}
                                type="number"
                                className="w-20"
                                title="Number of results (KNN k)"
                            />
                            <Button onClick={runSearch} disabled={searching || !query}>
                                {searching ? "Searching…" : "Search"}
                            </Button>
                        </div>

                        <Input
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder="Optional RediSearch filter, e.g. @release:{zurich}"
                            className="font-mono text-xs"
                        />

                        {searchError && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                                {searchError}
                            </div>
                        )}

                        {total !== null && (
                            <div className="text-xs text-gray-500">
                                {total.toLocaleString()} matches · showing{" "}
                                {hits.length}
                                {searchTime !== null &&
                                    ` · ${Math.round(searchTime)}ms`}
                            </div>
                        )}

                        {hits.length > 0 && (
                            <Tabs
                                value={resultsTab}
                                onValueChange={setResultsTab}
                                className="w-full"
                            >
                                <TabsList className="w-full">
                                    <TabsTrigger className="w-full" value="table">
                                        Results
                                    </TabsTrigger>
                                    <TabsTrigger className="w-full" value="2d">
                                        2D Graph
                                    </TabsTrigger>
                                    <TabsTrigger className="w-full" value="3d">
                                        3D
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="table" className="pt-2">
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2">
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-gray-500 mr-1">
                                                Per-result vector:
                                            </span>
                                            {VIZ_TYPES.map((v) => (
                                                <button
                                                    key={v}
                                                    onClick={() => setVizType(v)}
                                                    className={`text-xs px-2 py-0.5 rounded border capitalize ${
                                                        vizType === v
                                                            ? "bg-gray-800 text-white border-gray-800"
                                                            : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                                                    }`}
                                                >
                                                    {v}
                                                </button>
                                            ))}
                                        </div>

                                        {display && (
                                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                                {(
                                                    [
                                                        ["titleField", "Title"],
                                                        ["urlField", "Link"],
                                                        ["snippetField", "Text"],
                                                    ] as const
                                                ).map(([key, label]) => (
                                                    <label
                                                        key={key}
                                                        className="flex items-center gap-1"
                                                    >
                                                        <span className="text-gray-500">
                                                            {label}:
                                                        </span>
                                                        <select
                                                            value={display[key]}
                                                            onChange={(e) =>
                                                                updateDisplay({
                                                                    [key]: e.target
                                                                        .value,
                                                                } as Partial<DisplayConfig>)
                                                            }
                                                            className="border rounded px-1 py-0.5 bg-white"
                                                        >
                                                            <option value={NONE}>
                                                                — none —
                                                            </option>
                                                            {returnFields.map(
                                                                (f) => (
                                                                    <option
                                                                        key={f}
                                                                        value={f}
                                                                    >
                                                                        {f}
                                                                    </option>
                                                                )
                                                            )}
                                                        </select>
                                                    </label>
                                                ))}
                                                <label className="flex items-center gap-1 text-gray-500">
                                                    <input
                                                        type="checkbox"
                                                        checked={display.showAll}
                                                        onChange={(e) =>
                                                            updateDisplay({
                                                                showAll:
                                                                    e.target
                                                                        .checked,
                                                            })
                                                        }
                                                    />
                                                    all fields
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        {hits.map((hit) => {
                                            const title =
                                                (display?.titleField &&
                                                    hit.fields[display.titleField]) ||
                                                hit.id
                                            const url = display?.urlField
                                                ? hit.fields[display.urlField]
                                                : undefined
                                            const snippet = display?.snippetField
                                                ? hit.fields[display.snippetField]
                                                : undefined
                                            const scoreLabel =
                                                hit.similarity !== null
                                                    ? `${(hit.similarity * 100).toFixed(1)}%`
                                                    : hit.score.toFixed(4)
                                            return (
                                                <div
                                                    key={hit.id}
                                                    className="p-3 border rounded hover:bg-gray-50 flex gap-3"
                                                >
                                                    {hit.vector?.length ? (
                                                        <button
                                                            type="button"
                                                            className="flex-shrink-0 rounded hover:ring-2 hover:ring-blue-400 transition"
                                                            title={`${hit.vector.length}-dim vector — click to expand`}
                                                            onClick={() =>
                                                                setExpanded({
                                                                    vector: hit.vector as number[],
                                                                    name: title,
                                                                })
                                                            }
                                                        >
                                                            <VectorVisualizationRenderer
                                                                vector={hit.vector}
                                                                visualizationType={
                                                                    vizType
                                                                }
                                                                size={72}
                                                                showStats={false}
                                                                noPadding
                                                            />
                                                        </button>
                                                    ) : null}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="font-medium text-sm min-w-0">
                                                                {title}
                                                            </div>
                                                            <span
                                                                className="text-xs text-gray-500 whitespace-nowrap"
                                                                title={`distance ${hit.score}`}
                                                            >
                                                                {scoreLabel}
                                                            </span>
                                                        </div>
                                                        {url && (
                                                            <a
                                                                href={url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-xs text-blue-600 hover:underline break-all"
                                                            >
                                                                {url}
                                                            </a>
                                                        )}
                                                        {snippet && (
                                                            <div className="text-xs text-gray-600 mt-1 line-clamp-3">
                                                                {snippet}
                                                            </div>
                                                        )}
                                                        <div className="text-[10px] text-gray-400 mt-1">
                                                            {hit.id}
                                                        </div>
                                                        {display?.showAll && (
                                                            <div className="mt-2 pt-2 border-t space-y-0.5">
                                                                {Object.entries(
                                                                    hit.fields
                                                                ).map(([k, v]) => (
                                                                    <div
                                                                        key={k}
                                                                        className="text-[11px] flex gap-2"
                                                                    >
                                                                        <span className="text-gray-400 font-mono flex-shrink-0">
                                                                            {k}
                                                                        </span>
                                                                        <span className="text-gray-600 break-all line-clamp-2">
                                                                            {v}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </TabsContent>

                                <TabsContent value="2d">
                                    <div
                                        style={{
                                            height: "calc(100vh - 420px)",
                                            minHeight: "400px",
                                        }}
                                    >
                                        {hits[0]?.vector?.length ? (
                                            <HNSW2dViz
                                                key={`${hits[0].id}:${display?.titleField ?? ""}`}
                                                initialElement={{
                                                    element: hits[0].id,
                                                    similarity:
                                                        hits[0].similarity ??
                                                        1 - hits[0].score,
                                                    vector: hits[0].vector || [],
                                                    label: labelFor(hits[0]),
                                                }}
                                                maxNodes={MAX_GRAPH_NODES}
                                                initialNodes={Number(count) || 10}
                                                vectorSetName={indexName}
                                                getNeighbors={getNeighbors}
                                            />
                                        ) : (
                                            <div className="text-sm text-gray-500 p-4">
                                                No vectors returned for these
                                                results.
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="3d">
                                    <div
                                        style={{
                                            height: "calc(100vh - 420px)",
                                            minHeight: "400px",
                                        }}
                                    >
                                        <VectorViz3D
                                            data={hits
                                                .filter(
                                                    (h) =>
                                                        h.vector &&
                                                        h.vector.length > 0
                                                )
                                                .map((h) => ({
                                                    label: `${labelFor(h)}${
                                                        h.similarity !== null
                                                            ? ` (${(
                                                                  h.similarity *
                                                                  100
                                                              ).toFixed(1)}%)`
                                                            : ""
                                                    }`,
                                                    vector: h.vector as number[],
                                                }))}
                                        />
                                    </div>
                                </TabsContent>
                            </Tabs>
                        )}
                    </div>
                )}
            </TabsContent>

            {/* SCHEMA TAB */}
            <TabsContent value="schema" className="pt-4">
                <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-2 max-w-md">
                        <div className="text-gray-500">Index</div>
                        <div className="font-mono">{info.name}</div>
                        <div className="text-gray-500">Key type</div>
                        <div>{info.keyType}</div>
                        <div className="text-gray-500">Prefixes</div>
                        <div className="font-mono break-all">
                            {info.prefixes.join(", ") || "—"}
                        </div>
                        <div className="text-gray-500">Documents</div>
                        <div>{info.numDocs.toLocaleString()}</div>
                        {vectorField && (
                            <>
                                <div className="text-gray-500">Vector</div>
                                <div>
                                    {vectorField.attribute} · {vectorField.dim}d ·{" "}
                                    {vectorField.dataType} ·{" "}
                                    {vectorField.distanceMetric} ·{" "}
                                    {vectorField.algorithm}
                                </div>
                            </>
                        )}
                    </div>

                    <div>
                        <div className="font-semibold mb-1">Fields</div>
                        <table className="text-xs border-collapse">
                            <thead>
                                <tr className="text-left text-gray-500">
                                    <th className="pr-4 py-1">Attribute</th>
                                    <th className="pr-4 py-1">Type</th>
                                    <th className="pr-4 py-1">Identifier</th>
                                </tr>
                            </thead>
                            <tbody>
                                {info.fields.map((f) => (
                                    <tr key={f.attribute} className="border-t">
                                        <td className="pr-4 py-1 font-mono">
                                            {f.attribute}
                                        </td>
                                        <td className="pr-4 py-1">{f.type}</td>
                                        <td className="pr-4 py-1 font-mono text-gray-500">
                                            {f.identifier}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </TabsContent>

            {isConfigOpen && (
                <EditEmbeddingConfigModal
                    isOpen={isConfigOpen}
                    onClose={() => setIsConfigOpen(false)}
                    config={embedding}
                    onSave={(config) => {
                        saveEmbedding(config)
                        setIsConfigOpen(false)
                    }}
                    dataFormat="text"
                />
            )}

            {/* Full-screen vector viz on click (heatmap/distribution/radial/
                surface tabs + optional query-vs-result comparison). */}
            <VectorHeatmap
                vector={expanded?.vector ?? null}
                open={!!expanded}
                onOpenChange={(o) => {
                    if (!o) setExpanded(null)
                }}
                elementName={expanded?.name ?? null}
                searchVector={lastQueryVector}
                searchQuery={lastQuery}
                lastSearchDisplayName={lastQuery}
            />
        </Tabs>
    )
}
