import * as THREE from "three"

export interface VLinkResponse {
    success: boolean
    result: Array<[string, number, number[]]> // Array of levels, each containing array of [element, similarity, vector]
}

export interface VembResponse {
    success: boolean
    result: number[]
}

export interface ForceNode {
    mesh: THREE.Mesh
    label?: THREE.Sprite
    vector?: number[]
    x: number
    y: number
    vx?: number
    vy?: number
}

export interface ForceEdge {
    source: ForceNode
    target: ForceNode
    line: THREE.Line
    strength: number
    isParentChild?: boolean
}

export interface SimilarityItem {
    element: string // unique node identity (never displayed if `label` is set)
    similarity: number
    vector: number[]
    label?: string // optional human-readable display name; falls back to `element`
}

export interface FetchNeighborsResponse {
    success: boolean
    result: Array<{ element: string; similarity: number; vector?: number[] }>
}

export interface HNSWVizPureProps {
    initialElement: SimilarityItem
    maxNodes?: number
    initialNodes?: number
    vectorSetName: string
    /**
     * Fill the parent element instead of imposing the default
     * `calc(100vh - 400px)` height. That constant assumes the VectorSet page's
     * layout; hosts with more chrome above the graph collapse it to a sliver.
     */
    fitParent?: boolean
    getNeighbors: (
        element: string,
        count: number,
    ) => Promise<SimilarityItem[]>
}

export interface LayoutAlgorithm {
    name: string
    description: string
    apply: (
        nodes: ForceNode[],
        edges: ForceEdge[],
        rootNode?: ForceNode
    ) => void
    animate: boolean
}

export type LayoutAlgorithmType = "force" | "umap" | "pca"

// Window augmentation for TypeScript
declare global {
    interface Window {
        lastLayoutChange?: number
        [key: string]: any // For dynamic layout attempt flags
    }
}
