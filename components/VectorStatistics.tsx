interface VectorStatisticsProps {
    vector: number[]
    className?: string
    title?: string
}

export default function VectorStatistics({
    vector,
    className = "",
    title = "Statistics",
}: VectorStatisticsProps) {
    if (!vector || vector.length === 0) {
        return null
    }

    const min = Math.min(...vector)
    const max = Math.max(...vector)
    const average = vector.reduce((sum, val) => sum + val, 0) / vector.length
    const nonZeroCount = vector.filter((v) => v !== 0).length
    const nonZeroPercentage = (nonZeroCount / vector.length) * 100

    return (
        <div className={`border rounded-lg p-3 bg-slate-50 ${className}`}>
            <h4 className="font-medium mb-3">{title}</h4>
            <div className="text-sm space-y-2">
                <div className="flex justify-between">
                    <span>Dimensions:</span>
                    <span className="font-mono">{vector.length}</span>
                </div>
                <div className="flex justify-between">
                    <span>Range:</span>
                    <span className="font-mono">
                        {min.toFixed(4)} to {max.toFixed(4)}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span>Average:</span>
                    <span className="font-mono">{average.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Non-zero:</span>
                    <span className="font-mono">
                        {nonZeroCount} ({nonZeroPercentage.toFixed(1)}%)
                    </span>
                </div>
            </div>
        </div>
    )
}
