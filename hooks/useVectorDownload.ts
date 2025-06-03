import { VisualizationType } from "@/hooks/useVectorSettings"

interface UseVectorDownloadProps {
    showComparison: boolean
    visualizationType: VisualizationType
    elementName?: string | null
}

export function useVectorDownload({
    showComparison,
    visualizationType,
    elementName,
}: UseVectorDownloadProps) {
    const downloadVisualization = () => {
        const canvases = document.querySelectorAll(
            ".vector-visualization canvas"
        ) as NodeListOf<HTMLCanvasElement>

        if (canvases.length === 0) return

        if (showComparison && canvases.length >= 2) {
            const searchCanvas = canvases[0]
            const resultCanvas = canvases[1]

            const searchLink = document.createElement("a")
            searchLink.download = `search-vector-${visualizationType}.png`
            searchLink.href = searchCanvas.toDataURL("image/png")
            searchLink.click()

            setTimeout(() => {
                const resultLink = document.createElement("a")
                resultLink.download = `${elementName || "result"}-vector-${
                    visualizationType
                }.png`
                resultLink.href = resultCanvas.toDataURL("image/png")
                resultLink.click()
            }, 100)
        } else {
            const canvas = canvases[0]
            const link = document.createElement("a")
            link.download = `vector-${visualizationType}.png`
            link.href = canvas.toDataURL("image/png")
            link.click()
        }
    }

    return {
        downloadVisualization,
    }
}
