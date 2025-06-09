import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { clientEmbeddingService } from "@/services/embeddings/client/embeddingService"
import {
    getModelName,
    isTextEmbedding,
    isImageEmbedding,
    isMultiModalEmbedding
} from "@/services/embeddings/types/embeddingModels"
import { type VectorSetMetadata } from "@/lib/types/vectors"
import { ImageIcon, Shuffle, X } from "lucide-react"
import { useCallback, useMemo, useState, useEffect, useRef, forwardRef } from "react"
import MiniVectorHeatmap from "../MiniVectorHeatmap"
import { BorderBeam } from "@stianlarsen/border-beam"
import { useAnimationSettings } from "@/app/config/AnimationSettings"

export interface VectorSearchInputProps {
    // Display text (what user sees and types)
    displayText: string
    onDisplayTextChange: (text: string) => void
    
    // Generated embedding (called when embedding is ready)
    onEmbeddingGenerated?: (embedding: number[]) => void
    
    // Display name change (called when we have a human-readable name for the search)
    onDisplayNameChange?: (name: string) => void
    
    // Metadata for embedding generation
    metadata: VectorSetMetadata | null
    dim: number | null
    
    // Optional props to match SearchInput interface
    placeholder?: string
    disabled?: boolean
    className?: string
    searchType?: "Vector" | "Element" | "Multi-vector" // For compatibility
    lastTextEmbedding?: number[] // From useVectorSearch for single vector mode
    vectorSetName?: string | null // Add vectorSetName prop
}

/**
 * Unified Vector Search Input Component
 * 
 * This component matches the exact visual design and functionality of SearchInput
 * while providing unified behavior for both single and multi-vector modes
 */
const VectorSearchInput = forwardRef<HTMLTextAreaElement, VectorSearchInputProps>(({
    displayText,
    onDisplayTextChange,
    onEmbeddingGenerated,
    onDisplayNameChange,
    metadata,
    dim,
    placeholder,
    disabled = false,
    className = "",
    searchType = "Vector",
    lastTextEmbedding,
    vectorSetName
}, ref) => {

    // Get animation settings
    const { animationsDisabled } = useAnimationSettings()

    const supportsEmbeddings =
        metadata?.embedding.provider && metadata?.embedding.provider !== "none"

    // Keep track of whether we're using image or text for multimodal search
    const [activeSearchMode, setActiveSearchMode] = useState<"text" | "image">("text")

    // Track whether an image is selected for visual feedback
    const [hasImage, setHasImage] = useState<boolean>(false)

    // Keep the preview URL for the selected image
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)

    // Track hover state when dragging over the drop area
    const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false)
    
    // Store the current vector (for visualization)
    const [currentVector, setCurrentVector] = useState<number[] | null>(null)
    
    // Add embedding loading state - separate from search loading
    const [isGeneratingEmbedding, setIsGeneratingEmbedding] = useState<boolean>(false)
    
    // Add debouncing for text embedding generation
    const textEmbeddingTimerRef = useRef<NodeJS.Timeout | null>(null)

    // State for controlling BorderBeam visibility
    const [isFocused, setIsFocused] = useState<boolean>(false)
    const [isHovered, setIsHovered] = useState<boolean>(false)

    // Add validation error state for image-only models
    const [validationError, setValidationError] = useState<string | null>(null)

    // Check if the model only supports images (not text or multimodal)
    const isImageOnlyModel = useMemo(() => {
        if (!metadata?.embedding) return false
        return isImageEmbedding(metadata.embedding) && 
               !isTextEmbedding(metadata.embedding) && 
               !isMultiModalEmbedding(metadata.embedding)
    }, [metadata?.embedding])

    // Update current vector when lastTextEmbedding changes (for single vector mode)
    useEffect(() => {        
        if (lastTextEmbedding && lastTextEmbedding.length > 0) {
            setCurrentVector(lastTextEmbedding)
        }
    }, [lastTextEmbedding])
    
    // Function to validate if input is a valid vector with correct format and dimensions
    const isValidVectorWithDimensions = useCallback((text: string) => {
        if (!text.trim()) return true // Empty is valid
        
        const vectorData = text.split(",").map((n) => parseFloat(n.trim()))
        const hasValidFormat = !vectorData.some(isNaN) && vectorData.length > 1
        const hasCorrectDims = !dim || vectorData.length === dim
        
        return hasValidFormat && hasCorrectDims
    }, [dim])
    
    // Function to check if vector has correct dimensions
    const hasCorrectDimensions = useCallback((text: string) => {
        if (!text.trim() || !dim) return true // Empty is valid, or no dimension requirement
        
        const vectorData = text.split(",").map((n) => parseFloat(n.trim()))
        return vectorData.length === dim
    }, [dim])
    
    // Function to generate text embedding with debouncing
    const generateTextEmbedding = useCallback(async (text: string) => {
        if (!metadata?.embedding || metadata.embedding.provider === "none") {
            return
        }
        
        // Clear existing timer
        if (textEmbeddingTimerRef.current) {
            clearTimeout(textEmbeddingTimerRef.current)
        }
        
        // Set new timer for debounced embedding generation
        textEmbeddingTimerRef.current = setTimeout(async () => {
            try {
                console.log("Generating text embedding for:", text)
                setIsGeneratingEmbedding(true) // Start embedding generation loading
                const embedding = await clientEmbeddingService.getEmbedding(
                    text,
                    metadata.embedding,
                    false
                )
                
                if (embedding && embedding.length > 0) {
                    console.log("Generated text embedding, length:", embedding.length)
                    setCurrentVector(embedding)
                    
                    // Call onEmbeddingGenerated for both single and multi-vector modes
                    // MultiVectorInput needs this to store embeddings for visualization
                    if (onEmbeddingGenerated) {
                        onEmbeddingGenerated(embedding)
                    }
                }
            } catch (error) {
                console.error("Error generating text embedding:", error)
            } finally {
                setIsGeneratingEmbedding(false) // End embedding generation loading
            }
        }, 800) // Debounce text embedding generation
    }, [metadata, onEmbeddingGenerated])
    
    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (textEmbeddingTimerRef.current) {
                clearTimeout(textEmbeddingTimerRef.current)
            }
        }
    }, [])
    
    // Reset the image when text input changes
    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value
        
        // Clear any previous validation errors
        setValidationError(null)
        
        // If input is cleared, reset the current vector
        if (!newValue.trim()) {
            setCurrentVector(null)
            
            // Clear any pending embedding generation
            if (textEmbeddingTimerRef.current) {
                clearTimeout(textEmbeddingTimerRef.current)
                textEmbeddingTimerRef.current = null
            }
            setIsGeneratingEmbedding(false)
            
            // Notify parent to clear search vector (triggers performZeroVectorSearch)
            if (onEmbeddingGenerated) {
                onEmbeddingGenerated([])
            }
        }
        
        // For image-only models, validate that input is either empty or a valid vector
        if (isImageOnlyModel && newValue.trim()) {
            if (!isValidVectorWithDimensions(newValue)) {
                const dimensions = dim || "unknown"
                setValidationError(`Enter a valid vector (0.1, 0.2, ...) with ${dimensions} dimensions`)
                // Still update display text so user can see what they're typing
                onDisplayTextChange(newValue)
                // But don't process further - return early to prevent embedding generation
                return
            }
        }
        
        if (newValue && activeSearchMode === "image") {
            // Clear image when text is entered
            handleImageSelect("")
            setActiveSearchMode("text")
            setHasImage(false)
            setImagePreviewUrl(null)
        }
        
        onDisplayTextChange(newValue)
        
        // Generate text embedding if this looks like text (not a vector) and model supports text
        if (onEmbeddingGenerated && newValue.trim() && supportsEmbeddings && !isImageOnlyModel) {
            // Quick check if this looks like a vector (contains commas and numbers)
            const hasCommas = newValue.includes(',')
            const hasOnlyNumbersAndCommas = /^[\d\s,.-]+$/.test(newValue.trim())
            const isLikelyVector = hasCommas && hasOnlyNumbersAndCommas

            if (!isLikelyVector) {
                // This is likely text, not a vector - generate embedding
                generateTextEmbedding(newValue)
            } else {
                // This looks like a vector, clear any previous text embedding
                setCurrentVector(null)
            }
        }
    }

    // Handle image selection for multimodal
    const handleImageSelect = (base64Data: string) => {
        if (base64Data) {
            // Clear any validation errors when image is selected
            setValidationError(null)
            
            // Update image preview
            setImagePreviewUrl(base64Data)

            // Only set the image mode, but don't change the textarea content for multi-vector
            // For single vector mode, we may want to clear text
            setActiveSearchMode("image")
            setHasImage(true)

            // Clear text only for single vector mode
            if (searchType === "Vector" && displayText) {
                onDisplayTextChange("")
                setCurrentVector(null)
            }
        } else {
            setHasImage(false)
            setImagePreviewUrl(null)
        }
    }

    // Clear the selected image
    const clearSelectedImage = () => {
        handleImageSelect("")
        // Also clear any vector data in the textarea
        onDisplayTextChange("")
        setCurrentVector(null)
        
        // Clear any pending embedding generation
        if (textEmbeddingTimerRef.current) {
            clearTimeout(textEmbeddingTimerRef.current)
            textEmbeddingTimerRef.current = null
        }
        setIsGeneratingEmbedding(false)
        
        // Notify parent to clear search vector (triggers performZeroVectorSearch)
        if (onEmbeddingGenerated) {
            onEmbeddingGenerated([])
        }
    }

    // Compute the placeholder text based on current searchType and metadata
    const searchBoxPlaceholder = useMemo(() => {
        if (placeholder) return placeholder
        
        if (!metadata?.embedding) return ""

        switch (searchType) {
            case "Element":
                return "Enter Element"
            case "Vector":
                // For image-only models, only allow vector input
                if (isImageOnlyModel) {
                    return "Enter vector (0.1, 0.2, ...)"
                }
                return supportsEmbeddings && isTextEmbedding(metadata.embedding)
                    ? "Enter text or vector (0.1, 0.2, ...)"
                    : "Enter vector data (0.1, 0.2, ...)"
            default:
                return "Enter text or vector (0.1, 0.2, ...)"
        }
    }, [searchType, supportsEmbeddings, metadata?.embedding, placeholder, isImageOnlyModel])

    // Memoize the random vector generation function
    const generateRandomVector = useCallback(() => {
        if (!dim) return

        const randomVector = Array.from({ length: dim }, () =>
            Math.random() * 2 - 1
        ).map((n) => n.toFixed(4))

        const vectorString = randomVector.join(", ")
        onDisplayTextChange(vectorString)
        setCurrentVector(randomVector.map(Number))
        
        // Clear any validation errors when generating a valid vector
        setValidationError(null)
    }, [dim, onDisplayTextChange])

    // For image-related search types, generate the helper text
    const imageHelpText = useMemo(() => {
        if (isImageOnlyModel) {
            return "Enter vector (0.1, 0.2, ...)"
        }
        return "Enter text or vector (0.1, 0.2, ...)"
    }, [isImageOnlyModel])

    // Determine if we should show the image uploader - only show if the embedding model supports images
    const showImageUploader = (searchType === "Vector" || searchType === "Multi-vector") && 
        metadata?.embedding && 
        (isImageEmbedding(metadata.embedding) || isMultiModalEmbedding(metadata.embedding))

    // Always show text input
    const showTextInput = true

    // Show shuffle button for Vector searches
    const showShuffleButton = searchType === "Vector" || searchType === "Multi-vector"

    // For the simplified embedded image uploader
    const handleImageButtonClick = () => {
        // Clear any validation errors when opening image selector
        setValidationError(null)
        
        // Open a file dialog
        const input = document.createElement("input")
        input.type = "file"
        input.accept = "image/*"
        input.onchange = (e) => {
            const target = e.target as HTMLInputElement
            if (target.files && target.files.length > 0) {
                const file = target.files[0]
                const reader = new FileReader()
                reader.onload = async () => {
                    const base64 = reader.result as string
                    // This only sets the image preview and notifies the parent
                    // It doesn't put image data in the textarea
                    handleImageSelect(base64)

                    // Generate the embedding for the image
                    if (base64 && metadata?.embedding) {
                        try {
                            setIsGeneratingEmbedding(true) // Start embedding generation loading
                            // Generate embedding directly
                            const embedding =
                                await clientEmbeddingService.getEmbedding(
                                    base64,
                                    metadata.embedding,
                                    true
                                )
                            // Pass the embedding to our handler with filename
                            handleImageEmbeddingGenerated(embedding, file.name)
                            
                            // Update current vector for visualization
                            setCurrentVector(embedding)
                        } catch (error) {
                            console.error("Error generating embedding:", error)
                        } finally {
                            setIsGeneratingEmbedding(false) // End embedding generation loading
                        }
                    }
                }
                reader.readAsDataURL(file)
            }
        }
        input.click()
    }

    // Modified handler for image embedding generation
    const handleImageEmbeddingGenerated = (embedding: number[], filename: string) => {
        // For single vector mode, set search query to vector representation
        // For multi-vector mode, keep the original text and store embedding separately
        if (searchType === "Vector") {
            onDisplayTextChange(embedding.join(", "))
        }
        
        // Update the current vector for visualization
        setCurrentVector(embedding)
        
        // Set the display name to the image filename
        if (onDisplayNameChange) {
            onDisplayNameChange(filename)
        }
        
        // Notify parent of embedding
        if (onEmbeddingGenerated) {
            onEmbeddingGenerated(embedding)
        }
    }

    // Render the integrated search input matching SearchInput exactly
    return (
        <div className={`relative flex-1 w-full flex flex-col ${className}`}>
            <div className={`relative flex-1 w-full flex items-stretch`}>
                <div
                    className={`relative border rounded w-full flex items-stretch overflow-hidden ${
                        showShuffleButton ? "pr-24" : "pr-12"
                    }`}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    {/* Animated border beam effect - only show when focused or hovered and animations are enabled */}
                    {(isFocused || isHovered) && !animationsDisabled && (
                        <BorderBeam
                            size={120}
                            duration={20}
                            borderWidth={1}
                            delay={0}
                        />
                    )}

                    {/* Image button - simplified alternative to ImageUploader */}
                    {showImageUploader && (
                        <div
                            className={`flex-shrink-0 border-r flex flex-col justify-center items-center p-1 cursor-pointer ${
                                hasImage
                                    ? "bg-blue-50"
                                    : isDraggingOver
                                    ? "bg-blue-100"
                                    : "bg-gray-50 hover:bg-gray-100"
                            }`}
                            style={{
                                width: "80px",
                                minWidth: "80px",
                                height: "80px",
                            }}
                            onClick={!hasImage ? handleImageButtonClick : undefined}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            tabIndex={0}
                            onDragOver={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setIsDraggingOver(true)
                            }}
                            onDragLeave={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setIsDraggingOver(false)
                            }}
                            onDragExit={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setIsDraggingOver(false)
                            }}
                            onDrop={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setIsDraggingOver(false)
                                
                                // Clear any validation errors when image is dropped
                                setValidationError(null)
                                
                                if (
                                    e.dataTransfer.files &&
                                    e.dataTransfer.files.length > 0
                                ) {
                                    const file = e.dataTransfer.files[0]
                                    if (file.type.startsWith("image/")) {
                                        const reader = new FileReader()
                                        reader.onload = async () => {
                                            const base64 = reader.result as string
                                            // This only sets the image preview and notifies the parent
                                            // It doesn't put image data in the textarea
                                            handleImageSelect(base64)

                                            // Generate the embedding for the image
                                            if (base64 && metadata?.embedding) {
                                                try {
                                                    setIsGeneratingEmbedding(true) // Start embedding generation loading
                                                    // Generate embedding directly
                                                    const embedding =
                                                        await clientEmbeddingService.getEmbedding(
                                                            base64,
                                                            metadata.embedding,
                                                            true
                                                        )
                                                    // Pass the embedding to our handler
                                                    handleImageEmbeddingGenerated(
                                                        embedding,
                                                        file.name
                                                    )

                                                    // Update current vector for visualization
                                                    setCurrentVector(embedding)
                                                } catch (error) {
                                                    console.error(
                                                        "Error generating embedding:",
                                                        error
                                                    )
                                                } finally {
                                                    setIsGeneratingEmbedding(false) // End embedding generation loading
                                                }
                                            }
                                        }
                                        reader.readAsDataURL(file)
                                    }
                                }
                            }}
                        >
                            {!hasImage ? (
                                // Empty state - show icon and text
                                <div
                                    className={`h-full w-full flex flex-col items-center justify-center text-muted-foreground text-xs border border-dashed ${
                                        isDraggingOver
                                            ? "border-blue-400"
                                            : "border-gray-300"
                                    } rounded-md p-2 transition-colors duration-150`}
                                >
                                    <ImageIcon size={24} />
                                    <span
                                        className="text-center whitespace-nowrap mt-1"
                                        style={{ fontSize: "0.6rem" }}
                                    >
                                        <div>
                                        Image Search{" "}
                                        </div>
                                        {isDraggingOver
                                            ? "(drop now)"
                                            : "(drop here)"}
                                    </span>
                                </div>
                            ) : (
                                // Image preview state
                                <div className="h-full w-full relative">
                                    <img
                                        src={imagePreviewUrl || ""}
                                        alt="Preview"
                                        className="h-full w-full object-cover rounded-md"
                                        style={{ objectFit: "contain" }}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-0 right-0 p-0.5 rounded-full bg-white/80 h-5 w-5"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            clearSelectedImage()
                                        }}
                                        onFocus={() => setIsFocused(true)}
                                        onBlur={() => setIsFocused(false)}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Text input section */}
                    {showTextInput && (
                        <div className="flex-1 flex flex-col relative">
                            <Textarea
                                value={displayText}
                                onChange={handleTextChange}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                placeholder={
                                    showImageUploader
                                        ? imageHelpText
                                        : searchBoxPlaceholder
                                }
                                disabled={disabled}
                                className="border-0 flex-1 px-4 py-3 min-w-0 h-20 resize-none focus-visible:ring-0"
                                ref={ref}
                            />
                        </div>
                    )}

                    {/* For Image type only, show a message instead of an input */}
                    {!displayText && showImageUploader && !showTextInput && (
                        <div className="flex-1 flex items-center justify-center px-4 text-gray-500 text-sm h-20">
                            <div className="text-center">
                                <p>Drop an image to search by image</p>
                                <p className="text-xs mt-1 text-gray-400">
                                    Supported formats: JPG, PNG, GIF
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Random vector button */}
                    {showShuffleButton && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full"
                            onClick={generateRandomVector}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            title="Generate random vector"
                            disabled={disabled}
                        >
                            <Shuffle className="h-4 w-4" />
                        </Button>
                    )}
                    
                    {/* Embedding model info */}
                    {!displayText.trim() && !validationError && (
                        <div className="absolute bottom-1 right-1 flex flex-row gap-2 backdrop-blur-sm bg-white/80 rounded-tl-md px-0">
                            <div className="flex-grow"></div>
                            <div className="text-xs text-gray-400 p-0.5 px-1 rounded-lg w-fit mt-1">
                                Model:{" "}
                                <span className="">
                                    {metadata?.embedding.provider &&
                                        `${
                                            metadata?.embedding.provider
                                        } - ${getModelName(metadata?.embedding)}`}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Mini vector heatmap - moved outside the search input and full height */}
                {(searchType === "Vector" || searchType === "Multi-vector") && currentVector && currentVector.length > 0 && (
                    <div className="h-full flex items-stretch ml-2">
                        <MiniVectorHeatmap
                            vector={
                                currentVector && currentVector.length > 0
                                    ? currentVector
                                    : (lastTextEmbedding || null)
                            }
                            isGeneratingEmbedding={isGeneratingEmbedding}
                            vectorSetName={vectorSetName}
                            metadata={metadata}
                        />
                    </div>
                )}
            </div>
            
            {/* Validation error message - now outside the input container */}
            {validationError && (
                <div className="mt-2 bg-red-100 border border-red-300 rounded p-2 text-xs text-red-700">
                    {validationError}
                </div>
            )}
        </div>
    )
})

export default VectorSearchInput 