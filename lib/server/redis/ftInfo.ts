import { FtField, FtIndexInfo } from "@/lib/types/searchIndex"

// FT.INFO / FT.SEARCH replies are flat [k, v, k, v, ...] arrays. Turn one into
// a plain object (values kept as-is).
function pairsToObj(arr: unknown[]): Record<string, unknown> {
    const o: Record<string, unknown> = {}
    for (let i = 0; i + 1 < arr.length; i += 2) {
        o[String(arr[i])] = arr[i + 1]
    }
    return o
}

function toNumber(v: unknown): number {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
}

// Parse the raw FT.INFO reply into a typed FtIndexInfo.
export function parseFtInfo(name: string, raw: unknown[]): FtIndexInfo {
    const info = pairsToObj(raw)

    // index_definition: [ key_type, JSON, prefixes, [ ... ], ... ]
    const defArr = Array.isArray(info["index_definition"])
        ? (info["index_definition"] as unknown[])
        : []
    const def = pairsToObj(defArr)
    const keyType = String(def["key_type"] ?? "HASH")
    const prefixes = Array.isArray(def["prefixes"])
        ? (def["prefixes"] as unknown[]).map(String)
        : []

    const numDocs = toNumber(info["num_docs"])

    // attributes: array of flat attribute arrays
    const attrsRaw = Array.isArray(info["attributes"])
        ? (info["attributes"] as unknown[])
        : []
    const fields: FtField[] = attrsRaw.map((a) => {
        const ao = pairsToObj(a as unknown[])
        const field: FtField = {
            identifier: String(ao["identifier"] ?? ""),
            attribute: String(ao["attribute"] ?? ""),
            type: String(ao["type"] ?? ""),
        }
        if (field.type === "VECTOR") {
            field.algorithm = ao["algorithm"] ? String(ao["algorithm"]) : undefined
            field.dataType = ao["data_type"] ? String(ao["data_type"]) : undefined
            field.dim = ao["dim"] !== undefined ? toNumber(ao["dim"]) : undefined
            field.distanceMetric = ao["distance_metric"]
                ? String(ao["distance_metric"])
                : undefined
        }
        return field
    })

    const vectorField = fields.find((f) => f.type === "VECTOR")

    return { name, keyType, prefixes, numDocs, fields, vectorField }
}
