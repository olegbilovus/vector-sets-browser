import { useState, useEffect } from "react"
import { userSettings } from "@/lib/storage/userSettings"

interface UseVectorComparisonProps {
    open: boolean
    searchVector?: number[] | null
    resultVector?: number[] | null
}

export function useVectorComparison({
    open,
    searchVector,
    resultVector,
}: UseVectorComparisonProps) {
    const [showComparison, setShowComparison] = useState(false)

    const canCompare =
        searchVector && resultVector && searchVector.length === resultVector.length

    useEffect(() => {
        if (open && canCompare) {
            const stickyComparison =
                userSettings.get("vectorComparisonMode") === true
            setShowComparison(stickyComparison)
        } else if (open) {
            setShowComparison(false)
        }
    }, [open, canCompare])

    const handleComparisonToggle = () => {
        const newValue = !showComparison
        setShowComparison(newValue)
        userSettings.set("vectorComparisonMode", newValue)
    }

    return {
        showComparison,
        canCompare,
        handleComparisonToggle,
    }
}
