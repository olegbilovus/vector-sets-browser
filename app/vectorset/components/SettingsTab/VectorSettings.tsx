import { vectorSets } from "@/services/vector-sets"
import {
    DEFAULT_EMBEDDING,
    DEFAULT_EMBEDDING_CONFIG,
} from "@/app/vectorset/utils/constants"
import EditEmbeddingConfigModal from "@/components/EmbeddingConfig/EditEmbeddingConfigDialog"
import { getProviderIcon } from "@/components/EmbeddingConfig/EmbeddingIcons"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import eventBus, { AppEvents } from "@/lib/client/events/eventEmitter"
import {
    EmbeddingConfig,
    getEmbeddingDataFormat,
    getExpectedDimensions,
    getModelName,
    getProviderInfo,
} from "@/services/embeddings/types/embeddingModels"
import { vadd, vcard, vdim, vrem, vsim } from "@/services/redis-server/api"
import { VectorSetMetadata } from "@/lib/types/vectors"
import {
    AlertTriangle,
} from "lucide-react"
import { useEffect, useState } from "react"
import EmbeddingProcessVisualization from "./EmbeddingProcessVisualization"
import OllamaInfoPanel from "./OllamaInfoPanel"

interface VectorSettingsProps {
    vectorSetName: string
    metadata: VectorSetMetadata | null
    onMetadataUpdate?: (metadata: VectorSetMetadata) => void
}

export default function VectorSettings({
    vectorSetName,
    metadata,
    onMetadataUpdate,
}: VectorSettingsProps) {
    const [isEditConfigModalOpen, setIsEditConfigModalOpen] = useState(false)
    const [isWarningDialogOpen, setIsWarningDialogOpen] = useState(false)
    const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false)
    const [pendingEmbeddingConfig, setPendingEmbeddingConfig] =
        useState<EmbeddingConfig | null>(null)
    const [successInfo, setSuccessInfo] = useState<{
        oldModel: string
        newModel: string
        dimensions: number
    } | null>(null)
    const [actualVectorDim, setActualVectorDim] = useState<number | null>(null)
    const [dimensionMismatch, setDimensionMismatch] = useState(false)

    // Fetch actual vector dimensions from Redis
    useEffect(() => {
        const fetchVectorDimensions = async () => {
            if (!vectorSetName) return

            try {
                const dimResponse = await vdim({ keyName: vectorSetName })
                if (dimResponse.success && dimResponse.result !== undefined) {
                    setActualVectorDim(dimResponse.result)

                    // Check for dimension mismatch
                    if (metadata?.embedding) {
                        const expectedDimensions = getExpectedDimensions(
                            metadata.embedding
                        )
                        setDimensionMismatch(
                            expectedDimensions > 0 &&
                                dimResponse.result !== expectedDimensions
                        )
                    }
                }
            } catch (error) {
                console.error(
                    "[VectorSettings] Error fetching vector dimensions:",
                    error
                )
            }
        }

        fetchVectorDimensions()
    }, [vectorSetName, metadata])

    const handleEditConfig = async (newConfig: EmbeddingConfig) => {
        try {
            if (!vectorSetName) {
                throw new Error("No vector set selected")
            }

            // Check if this is a different embedding model
            const isEmbeddingModelChange =
                metadata?.embedding &&
                (metadata.embedding.provider !== newConfig.provider ||
                    getModelName(metadata.embedding) !==
                        getModelName(newConfig))

            if (isEmbeddingModelChange) {
                // Check vector count
                const countResponse = await vcard({ keyName: vectorSetName })
                if (!countResponse.success) {
                    throw new Error("Failed to get vector count")
                }

                if (countResponse.result === 1) {
                    // Check if it's the default vector
                    const searchResult = await vsim({
                        keyName: vectorSetName,
                        count: 1,
                        searchElement: "Placeholder (Vector)",
                    })

                    if (
                        searchResult.success &&
                        searchResult.result &&
                        searchResult.result.length > 0
                    ) {
                        const recordName = searchResult.result[0][0]
                        if (recordName === "Placeholder (Vector)") {
                            // Delete the default vector
                            await vrem({
                                keyName: vectorSetName,
                                element: recordName,
                            })

                            // Add back the default vector (with the new config)
                            const dimensions =
                                getExpectedDimensions(newConfig) ||
                                DEFAULT_EMBEDDING.DIMENSIONS

                            const addResponse = await vadd({
                                keyName: vectorSetName,
                                element: "Placeholder (Vector)",
                                vector: Array(dimensions).fill(0),
                                reduceDimensions:
                                    metadata?.redisConfig?.reduceDimensions,
                                quantization:
                                    metadata?.redisConfig?.quantization,
                            })

                            if (!addResponse.success) {
                                throw new Error(
                                    `Failed to add default vector: ${addResponse.error}`
                                )
                            }

                            // Store success info before the update
                            setSuccessInfo({
                                oldModel: getModelName(metadata.embedding),
                                newModel: getModelName(newConfig),
                                dimensions,
                            })

                            // Proceed with the update
                            await saveEmbeddingConfig(newConfig)

                            // Notify that dimensions have changed
                            eventBus.emit(
                                AppEvents.VECTORSET_DIMENSIONS_CHANGED,
                                {
                                    vectorSetName,
                                    dimensions,
                                }
                            )

                            // Show success dialog
                            setIsSuccessDialogOpen(true)

                            return
                        }
                    }
                }

                if (countResponse.result && countResponse.result > 1) {
                    // Since we have real data (50 vectors), we should show the warning dialog
                    // The user needs to decide if they want to change the embedding model
                    // which could affect compatibility with existing vectors
                    console.log(
                        "[VectorSettings] Multiple real vectors detected, showing warning dialog..."
                    )
                    setPendingEmbeddingConfig(newConfig)
                    setIsWarningDialogOpen(true)
                    setIsEditConfigModalOpen(false)
                    return
                }

                // If we get here, we have real data vectors, so show the warning dialog
                setPendingEmbeddingConfig(newConfig)
                setIsWarningDialogOpen(true)
                setIsEditConfigModalOpen(false)
                return
            }

            // If no warning needed, proceed with the update
            console.log(
                "[VectorSettings] No embedding model change detected, calling saveEmbeddingConfig..."
            )
            await saveEmbeddingConfig(newConfig)
        } catch (error) {
            console.error("[VectorSettings] Error saving config:", error)
        }
    }

    const saveEmbeddingConfig = async (newConfig: EmbeddingConfig) => {
        const updatedMetadata: VectorSetMetadata = {
            ...metadata,
            embedding: newConfig,
            created: metadata?.created || new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
        }

        try {
            await vectorSets.setMetadata({
                name: vectorSetName,
                metadata: updatedMetadata,
            })

            // Notify parent of metadata update
            onMetadataUpdate?.(updatedMetadata)

            setIsEditConfigModalOpen(false)
            setIsWarningDialogOpen(false)
            setIsSuccessDialogOpen(false)
            setPendingEmbeddingConfig(null)

            // Check for dimension mismatch after updating config
            if (actualVectorDim !== null) {
                const expectedDimensions = getExpectedDimensions(newConfig)
                setDimensionMismatch(
                    expectedDimensions > 0 &&
                        actualVectorDim !== expectedDimensions
                )
            }
        } catch (error) {
            console.error(
                "[VectorSettings] Error in saveEmbeddingConfig:",
                error
            )
            throw error
        }
    }

    const handleConfirmEmbeddingChange = async () => {
        if (pendingEmbeddingConfig) {
            await saveEmbeddingConfig(pendingEmbeddingConfig)
        }
    }


    const handleEnableEmbedding = (checked: boolean) => {
        if (checked) {
            // Open the modal to configure embedding
            setIsEditConfigModalOpen(true)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center w-full space-x-2">
                        <CardTitle>Embedding Model Configuration</CardTitle>
                        <div className="grow"></div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="w-full flex items-center">
                        <div className="grow"></div>
                    </div>
                    <p className="text-sm text-gray-600">
                        The embedding engine is a convenience feature used by
                        vector-set-browser for <strong>VSIM</strong> and{" "}
                        <strong>VADD</strong> operations. It does not affect the
                        redis-server or the underlying vector-set data.
                    </p>

                    {/* Dimension mismatch warning */}
                    {dimensionMismatch &&
                        metadata?.embedding &&
                        metadata.embedding.provider !== "none" && (
                            <Alert variant="destructive" className="mt-4 mb-2">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Dimension Mismatch</AlertTitle>
                                <AlertDescription>
                                    The selected embedding model produces
                                    vectors with{" "}
                                    {getExpectedDimensions(metadata.embedding)}{" "}
                                    dimensions, but the VectorSet contains
                                    vectors with {actualVectorDim} dimensions.
                                    This will cause compatibility issues when
                                    adding new items.
                                </AlertDescription>
                            </Alert>
                        )}

                    {/* Embedding content */}
                    {metadata?.embedding &&
                    metadata.embedding.provider !== "none" ? (
                        <div
                            key={`${metadata.embedding.provider}-${getModelName(
                                metadata.embedding
                            )}-${metadata.lastUpdated}`}
                            className="flex flex-col p-4 bg-white rounded-md border border-slate-200"
                        >
                            {/* Top part with model info */}
                            <div className="flex items-start">
                                {/* Provider logo and model info */}
                                <div className="grow">
                                    <div className="flex items-center mb-2">
                                        <div className="p-2 bg-slate-100 rounded-md mr-3 flex items-center justify-center">
                                            {(() => {
                                                const IconComponent =
                                                    getProviderIcon(
                                                        metadata.embedding
                                                            .provider
                                                    )
                                                return <IconComponent />
                                            })()}
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-slate-500">
                                                {
                                                    getProviderInfo(
                                                        metadata.embedding
                                                            .provider
                                                    ).displayName
                                                }
                                            </div>
                                            <div className="text-lg font-bold">
                                                {getModelName(
                                                    metadata.embedding
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Data type badges */}
                                    {/* <DataTypeBadges
                                        config={metadata.embedding}
                                    /> */}

                                    {/* Dimensions info */}
                                    {/* {actualVectorDim !== null && (
                                        <div className="flex items-center mt-2">
                                            <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-800 rounded-md text-xs font-mono">
                                                <Cpu className="h-3 w-3" />
                                                <span>
                                                    {getExpectedDimensions(
                                                        metadata.embedding
                                                    )}
                                                    -d
                                                    {dimensionMismatch &&
                                                        actualVectorDim !==
                                                            null &&
                                                        ` (VectorSet: ${actualVectorDim}-d)`}
                                                </span>
                                            </div>
                                        </div>
                                    )} */}
                                </div>

                                {/* Configure button */}
                                <Button
                                    variant="outline"
                                    onClick={() =>
                                        setIsEditConfigModalOpen(true)
                                    }
                                >
                                    Change Model
                                </Button>
                            </div>

                            {/* Embedding process visualization */}
                            <EmbeddingProcessVisualization
                                dataFormat={getEmbeddingDataFormat(
                                    metadata.embedding
                                )}
                                config={metadata.embedding}
                                dimensions={getExpectedDimensions(
                                    metadata.embedding
                                )}
                            />

                            {/* Additional info based on model */}
                            {metadata.embedding.provider === "clip" && (
                                <div className="text-xs text-slate-600 mt-2 p-2 bg-slate-50 rounded">
                                    <p className="font-medium">
                                        Multi-modal embedding:
                                    </p>
                                    <p>
                                        This model creates embeddings where text
                                        and images share the same vector space,
                                        enabling similarity search across
                                        different data types.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-4 p-4">
                            <div className="grow">
                                <div className="flex justify-between items-center w-full">
                                    <div className="flex flex-col">
                                        <div className="font-bold text-red-600">
                                            {metadata?.embedding?.provider === "none"
                                                ? "Embedding is disabled"
                                                : "No Embedding Configuration"}
                                        </div>
                                        <div className="text-sm text-gray-600 mt-1">
                                            {metadata?.embedding?.provider === "none"
                                                ? "Enable to use VSIM search and VADD operations"
                                                : "This vector set was created outside of the browser and doesn't have an embedding configuration. Enable embedding to use VSIM search and VADD operations in the web interface."}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-600">Enable vector Embedding Model</span>
                                        <Switch
                                            id="enable-embedding"
                                            checked={false}
                                            onCheckedChange={(checked) => {
                                                handleEnableEmbedding(checked)
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Ollama Info Panel - Show when Ollama is selected */}
                    {metadata?.embedding?.provider === "ollama" && (
                        <OllamaInfoPanel config={metadata.embedding} />
                    )}
                </CardContent>
            </Card>

            <EditEmbeddingConfigModal
                isOpen={isEditConfigModalOpen}
                onClose={() => setIsEditConfigModalOpen(false)}
                config={
                    (metadata?.embedding as EmbeddingConfig) ||
                    DEFAULT_EMBEDDING_CONFIG
                }
                onSave={handleEditConfig}
            />

            {/* Warning Dialog for Embedding Model Change */}
            <Dialog
                open={isWarningDialogOpen}
                onOpenChange={setIsWarningDialogOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change Embedding Model?</DialogTitle>
                        <DialogDescription>
                            You are about to change the embedding model for this
                            vector set. This vector set contains{" "}
                            {metadata && "recordCount" in metadata
                                ? String(metadata.recordCount)
                                : "multiple"}{" "}
                            vectors. Changing the embedding model may affect
                            compatibility with existing vectors.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                            <p className="text-sm text-yellow-800">
                                <strong>Warning:</strong> The new embedding
                                model may produce vectors with different
                                dimensions or characteristics than the existing
                                vectors. This could affect search results and
                                similarity calculations.
                            </p>
                        </div>
                        {pendingEmbeddingConfig && (
                            <div className="space-y-2">
                                <p className="text-sm">
                                    <strong>Current:</strong>{" "}
                                    {metadata?.embedding
                                        ? getModelName(metadata.embedding)
                                        : "None"}
                                </p>
                                <p className="text-sm">
                                    <strong>New:</strong>{" "}
                                    {getModelName(pendingEmbeddingConfig)}
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsWarningDialogOpen(false)
                                setPendingEmbeddingConfig(null)
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmEmbeddingChange}
                        >
                            Change Embedding Model
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Success Dialog */}
            <Dialog
                open={isSuccessDialogOpen}
                onOpenChange={setIsSuccessDialogOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Embedding Model Changed Successfully
                        </DialogTitle>
                        <DialogDescription>
                            The embedding model has been updated and the
                            placeholder vector has been recreated with the new
                            dimensions.
                        </DialogDescription>
                    </DialogHeader>
                    {successInfo && (
                        <div className="space-y-2">
                            <p className="text-sm">
                                <strong>Changed from:</strong>{" "}
                                {successInfo.oldModel}
                            </p>
                            <p className="text-sm">
                                <strong>Changed to:</strong>{" "}
                                {successInfo.newModel}
                            </p>
                            <p className="text-sm">
                                <strong>New dimensions:</strong>{" "}
                                {successInfo.dimensions}
                            </p>
                        </div>
                    )}
                    <div className="flex justify-end pt-4">
                        <Button onClick={() => setIsSuccessDialogOpen(false)}>
                            OK
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
