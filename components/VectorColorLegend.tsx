import { ColorScheme } from "@/hooks/useVectorSettings"

interface VectorColorLegendProps {
    vector: number[]
    colorScheme: ColorScheme
    className?: string
}

export default function VectorColorLegend({
    vector,
    colorScheme,
    className = "",
}: VectorColorLegendProps) {
    if (!vector || vector.length === 0) {
        return null
    }

    const vectorMin = Math.min(...vector)
    const vectorMax = Math.max(...vector)

    // The gradient always represents the full -1 to +1 range
    // Map the vector's actual min/max values to their position within that range
    const minPos = Math.max(0, Math.min(100, ((vectorMin + 1) / 2) * 100))
    const maxPos = Math.max(0, Math.min(100, ((vectorMax + 1) / 2) * 100))

    const getGradient = (scheme: ColorScheme) => {
        switch (scheme) {
            case "thermal":
                return "linear-gradient(to right, #000000, #400080, #ff0000, #ffa500, #ffff00, #ffffff)"
            case "viridis":
                return "linear-gradient(to right, #440154, #440080, #31688e, #35b779, #fde725)"
            case "classic":
                return "linear-gradient(to right, #6495ed, #ffffff, #dc1426)"
            default:
                return "linear-gradient(to right, #000000, #400080, #ff0000, #ffa500, #ffff00, #ffffff)"
        }
    }

    return (
        <div className={`w-full ${className}`}>
            {/* Range Indicator Above Gradient */}
            <div className="relative w-full mb-1">
                {/* Tickmarks container */}
                <div className="relative w-full h-2">
                    {/* Min tickmark */}
                    <div
                        className="absolute top-0 h-full w-px border-l-2 border-dashed border-gray-700"
                        style={{ left: `${minPos}%` }}
                        title={`Min: ${vectorMin.toFixed(4)}`}
                    />
                    {/* Max tickmark */}
                    <div
                        className="absolute top-0 h-full w-px border-l-2 border-dashed border-gray-700"
                        style={{ left: `${maxPos}%` }}
                        title={`Max: ${vectorMax.toFixed(4)}`}
                    />
                    {/* Range bracket */}
                    {minPos !== maxPos && (
                        <div
                            className="absolute top-1 h-1 border-l border-r border-t border-gray-700"
                            style={{
                                left: `${Math.min(minPos, maxPos)}%`,
                                width: `${Math.abs(maxPos - minPos)}%`,
                            }}
                        />
                    )}
                </div>
            </div>

            <div
                className="w-full h-6 rounded border relative"
                style={{
                    background: getGradient(colorScheme),
                }}
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>-1.0</span>
                <span>0.0</span>
                <span>+1.0</span>
            </div>
            {/* Range values display */}
            <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Min: {vectorMin.toFixed(3)}</span>
                <span>Max: {vectorMax.toFixed(3)}</span>
            </div>
        </div>
    )
}
