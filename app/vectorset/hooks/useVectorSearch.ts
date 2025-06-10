import { ApiError } from "@/services/client"
import { embeddings } from "@/services/embeddings/client"
import { VectorTuple, vdim, vsim, VsimResult } from "@/services/redis-server/api"
import { useCallback, useEffect, useRef, useState } from "react"
import { VectorSetMetadata, VectorSetSearchOptions } from "@/lib/types/vectors"
import { userSettings } from "@/lib/storage/userSettings"
import { SearchType } from "@/components/SearchOptions/SearchTypeSelector"
import eventBus, { AppEvents } from "@/lib/client/events/eventEmitter"

// Helper to convert VsimResult to VectorTuple array
const convertToVectorTuple = (results: VsimResult): VectorTuple[] => {
    return results.map(([element, score, vector, attributes]) => [element, score, vector, attributes]);
}

interface UseVectorSearchProps {
    vectorSetName: string | null
    metadata: VectorSetMetadata | null
    onSearchResults: (results: VectorTuple[]) => void
    onStatusChange: (status: string) => void
    onError?: (error: string | null) => void // Add dedicated error handler
    searchState: VectorSetSearchOptions
    onSearchStateChange: (state: Partial<VectorSetSearchOptions>) => void
    fetchEmbeddings?: boolean // Renamed from embeddings
}

interface UseVectorSearchReturn {
    searchType: SearchType
    setSearchType: (type: SearchType) => void
    searchQuery: string
    setSearchQuery: (query: string) => void
    searchFilter: string
    setSearchFilter: (filter: string) => void
    searchCount: string
    setSearchCount: (count: string) => void
    isSearching: boolean
    resultsTitle: string
    setResultsTitle: (title: string) => void
    searchTime?: string
    error: string | null // Add error to the return type
    clearError: () => void // Add function to clear errors
    searchExplorationFactor?: number
    setSearchExplorationFactor: (value: number | undefined) => void
    filterExplorationFactor?: number
    setFilterExplorationFactor: (value: number | undefined) => void
    forceLinearScan: boolean
    setForceLinearScan: (value: boolean) => void
    noThread: boolean
    setNoThread: (value: boolean) => void
    lastTextEmbedding?: number[] // Add lastTextEmbedding to the return type
    setLastTextEmbedding: (embedding: number[] | undefined) => void // Add function to manually set lastTextEmbedding
    lastSearchDisplayName?: string // Add lastSearchDisplayName to track human-readable search names
    setLastSearchDisplayName: (name: string | undefined) => void // Add function to set lastSearchDisplayName
    executedCommand?: string
    vectorFormat?: 'FP32' | 'VALUES'
    setVectorFormat: (format: 'FP32' | 'VALUES') => void
}

export function useVectorSearch({
    vectorSetName,
    metadata,
    onSearchResults,
    onStatusChange,
    onError,
    searchState,
    onSearchStateChange,
    fetchEmbeddings = false,
}: UseVectorSearchProps): UseVectorSearchReturn {
    const [isSearching, setIsSearching] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
    const initialSearchDone = useRef(false)
    const lastSearchRef = useRef<{
        query: string
        type: "Vector" | "Multi-vector" | "Element" | "Image" 
        count: string
        filter: string
    }>({ query: "", type: "Vector", count: "10", filter: "" })
    // Add a ref to track the current vector set being searched
    const currentSearchVectorSetRef = useRef<string | null>(null)

    // Load search options from userSettings
    const getSearchOptionsFromUserSettings = useCallback(() => {
        // Get search options from userSettings
        const useCustomEF = userSettings.get("useCustomEF") ?? false;
        const efValue = userSettings.get("efValue") ?? "200";
        const useCustomFilterEF = userSettings.get("useCustomFilterEF") ?? false;
        const filterEFValue = userSettings.get("filterEFValue") ?? "100";
        
        // Calculate exploration factors based on settings
        const searchExplorationFactor = useCustomEF ? parseInt(efValue) : undefined;
        const filterExplorationFactor = useCustomFilterEF ? parseInt(filterEFValue) : undefined;
        
        // Get linear scan and threading options
        const forceLinearScan = userSettings.get("forceLinearScan") === true;
        const noThread = userSettings.get("noThread") === true;
        
        // Get vector format
        const vectorFormat = userSettings.get("vectorFormat") as 'FP32' | 'VALUES' || 'FP32';
        
        return {
            searchExplorationFactor,
            filterExplorationFactor,
            forceLinearScan,
            noThread,
            vectorFormat
        };
    }, []);

    // Internal search state management
    const [internalSearchState, setInternalSearchState] =
        useState<VectorSetSearchOptions>(() => {
            const userSettingsOptions = getSearchOptionsFromUserSettings();
            
            return {
                searchType: "Vector",
                searchQuery: "",
                searchCount: "10",
                searchFilter: "",
                resultsTitle: "Search Results",
                searchTime: undefined,
                searchExplorationFactor: userSettingsOptions.searchExplorationFactor,
                filterExplorationFactor: userSettingsOptions.filterExplorationFactor,
                forceLinearScan: userSettingsOptions.forceLinearScan,
                noThread: userSettingsOptions.noThread,
                lastTextEmbedding: undefined,
                lastSearchDisplayName: undefined,
                vectorFormat: userSettingsOptions.vectorFormat,
            };
        });
        
    // Handle search state updates
    const updateSearchState = useCallback(
        (update: Partial<VectorSetSearchOptions>) => {
            setInternalSearchState((prev) => {
                const next = { ...prev, ...update }
                onSearchStateChange(next)
                return next
            })
        },
        [onSearchStateChange]
    )

    // Function to clear error
    const clearError = useCallback(() => {
        setError(null)
        if (onError) onError(null)
    }, [onError])

    // Helper function to set error
    const handleError = useCallback(
        (errorMessage: string) => {
            setError(errorMessage)
            if (onError) onError(errorMessage)
        },
        [onError]
    )

    // Function to perform a zero vector search
    const performZeroVectorSearch = useCallback(
        async (count: number) => {
            if (!vectorSetName) return

            try {
                setIsSearching(true)
                // Clear any previous errors when starting a new search
                clearError()

                const dimResponse = await vdim({ keyName: vectorSetName! })
                if (!dimResponse.success || dimResponse.result === undefined) {
                    handleError(dimResponse.error || "Failed to get vector dimensions")
                    return
                }
                const zeroVector = Array(dimResponse.result).fill(0)

                // Perform search using the server-side timing
                const vsimResponse = await vsim({
                    keyName: vectorSetName!,
                    searchVector: zeroVector,
                    count,
                    withEmbeddings: fetchEmbeddings,
                    withAttribs: userSettings.getUseWithAttribs(),
                    filter: internalSearchState.searchFilter,
                    searchExplorationFactor: internalSearchState.searchExplorationFactor,
                    filterExplorationFactor: internalSearchState.filterExplorationFactor,
                    forceLinearScan: internalSearchState.forceLinearScan,
                    noThread: internalSearchState.noThread,
                    vectorFormat: internalSearchState.vectorFormat,
                })

                if (!vsimResponse || !vsimResponse.success) {
                    // Handle filter syntax errors specifically
                    if (vsimResponse?.isFilterSyntaxError) {
                        handleError(vsimResponse.error || "Invalid filter syntax")
                    } else {
                        handleError(vsimResponse?.error || "Zero vector search failed")
                    }
                    return
                }

                // Use the execution time from the server response
                if (vsimResponse.executionTimeMs) {
                    const durationInSeconds = (
                        vsimResponse.executionTimeMs / 1000
                    ).toFixed(4)
                    updateSearchState({ searchTime: durationInSeconds })
                }
                onStatusChange("")
                // Process results
                onSearchResults(convertToVectorTuple(vsimResponse.result || []))

                if (vsimResponse.executedCommand) {
                    updateSearchState({ executedCommand: vsimResponse.executedCommand })
                }
            } catch (error) {
                console.error("Zero vector search error:", error)
                // Format the error as a string before passing to error handler
                const errorMessage =
                    error instanceof Error ? error.message : String(error)
                handleError(errorMessage)
                onSearchResults([])
            } finally {
                setIsSearching(false)
            }
        },
        [
            vectorSetName,
            onSearchResults,
            onStatusChange,
            fetchEmbeddings,
            internalSearchState.searchFilter,
            internalSearchState.searchExplorationFactor,
            internalSearchState.filterExplorationFactor,
            internalSearchState.forceLinearScan,
            internalSearchState.noThread,
            internalSearchState.vectorFormat,
            clearError,
            handleError,
            updateSearchState,
        ]
    )

    // Reset when vectorSetName changes
    useEffect(() => {
        // Skip if this vectorSetName is already being processed
        if (
            vectorSetName &&
            currentSearchVectorSetRef.current === vectorSetName
        ) {
            return
        }

        // Set current vector set being processed
        currentSearchVectorSetRef.current = vectorSetName

        // Clear any pending searches
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current)
        }

        // Clear any previous errors
        clearError()

        // Save the current filter before resetting
        const currentFilter = internalSearchState.searchFilter

        // Reset internal state but preserve the filter
        initialSearchDone.current = false
        lastSearchRef.current = {
            query: "",
            type: "Vector",
            count: "10",
            filter: currentFilter, // Preserve the filter
        }

        // Load search options from userSettings
        const userSettingsOptions = getSearchOptionsFromUserSettings();

        // Create new state object with settings from userSettings
        const newState: VectorSetSearchOptions = {
            searchType: "Vector" as const,
            searchQuery: "",
            searchCount: "10",
            searchFilter: currentFilter, // Preserve the filter
            resultsTitle: "Search Results",
            searchTime: undefined,
            lastTextEmbedding: undefined,
            lastSearchDisplayName: undefined,
            // Initialize search options from userSettings
            searchExplorationFactor: userSettingsOptions.searchExplorationFactor,
            filterExplorationFactor: userSettingsOptions.filterExplorationFactor,
            forceLinearScan: userSettingsOptions.forceLinearScan,
            noThread: userSettingsOptions.noThread,
            vectorFormat: userSettingsOptions.vectorFormat,
        };

        setInternalSearchState(newState)
        onSearchStateChange(newState)

        // Clear results and status
        onSearchResults([])
        onStatusChange("")

        // Only perform zero vector search if we have a valid vector set
        if (vectorSetName) {
            setIsSearching(true)

            performZeroVectorSearch(10)
                .catch((error) => {
                    console.error("Zero vector search error:", error)
                    const errorMessage =
                        error instanceof Error ? error.message : String(error)
                    handleError(errorMessage)
                })
                .finally(() => {
                    setIsSearching(false)
                    // Clear the current search vector set when done
                    currentSearchVectorSetRef.current = null
                })
        } else {
            // Clear the current search vector set if no vector set name
            currentSearchVectorSetRef.current = null
        }
    }, [
        vectorSetName,
        onSearchResults,
        onStatusChange,
        onSearchStateChange,
        performZeroVectorSearch,
        clearError,
        handleError,
        internalSearchState.searchFilter,
        getSearchOptionsFromUserSettings,
    ])

    // Sync with userSettings when they change
    useEffect(() => {
        // Watch for changes to userSettings
        const handleStorageChange = (e: StorageEvent) => {
            if (!e.key) return;
            
            if (e.key.startsWith('user-settings:')) {
                const settingKey = e.key.replace('user-settings:', '');
                
                // If the changed setting is related to search options, update internal state
                if (['useCustomEF', 'efValue', 'useCustomFilterEF', 'filterEFValue', 
                     'forceLinearScan', 'noThread'].includes(settingKey)) {
                    const userSettingsOptions = getSearchOptionsFromUserSettings();
                    updateSearchState({
                        searchExplorationFactor: userSettingsOptions.searchExplorationFactor,
                        filterExplorationFactor: userSettingsOptions.filterExplorationFactor,
                        forceLinearScan: userSettingsOptions.forceLinearScan,
                        noThread: userSettingsOptions.noThread,
                        vectorFormat: userSettingsOptions.vectorFormat,
                    });
                }
            }
        };
        
        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [getSearchOptionsFromUserSettings, updateSearchState]);

    // Sync the internalSearchState with the searchState props when they change
    useEffect(() => {
        if (searchState) {
            // Update internal state from searchState props
            setInternalSearchState((prev) => ({
                ...prev,
                searchExplorationFactor: searchState.searchExplorationFactor,
                filterExplorationFactor: searchState.filterExplorationFactor,
                forceLinearScan: searchState.forceLinearScan,
                noThread: searchState.noThread,
                vectorFormat: searchState.vectorFormat,
            }));
        }
    }, [searchState]);

    // Listen for vector deletion events to clear search vector
    useEffect(() => {
        if (!vectorSetName) return;

        const handleVectorDeleted = (eventData: { 
            vectorSetName: string; 
            element?: string; 
            elements?: string[]; 
            newCount: number 
        }) => {
            // Only clear search if the deletion is for the current vector set
            if (eventData.vectorSetName === vectorSetName) {
                console.log(`[useVectorSearch] Vector(s) deleted in ${vectorSetName}, clearing search vector`);
                
                // Clear the search query and last text embedding to trigger zero vector search
                updateSearchState({
                    searchQuery: "",
                    lastTextEmbedding: undefined,
                    lastSearchDisplayName: undefined,
                });
                
                // Clear any previous errors
                clearError();
            }
        };

        // Subscribe to vector deletion events
        const unsubscribe = eventBus.on(AppEvents.VECTOR_DELETED, handleVectorDeleted);

        // Cleanup on unmount or when vectorSetName changes
        return () => {
            unsubscribe();
        };
    }, [vectorSetName, updateSearchState, clearError]);

    // Debounced search effect
    useEffect(() => {
        if (!vectorSetName || !metadata) {
            return
        }

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current)
        }

        // Use a longer timeout for filter changes to give users time to type
        const timeoutDuration =
            lastSearchRef.current.filter !== internalSearchState.searchFilter
                ? 800
                : 300

        searchTimeoutRef.current = setTimeout(() => {
            performSearch()
        }, timeoutDuration)

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current)
            }
        }
    }, [
        vectorSetName,
        metadata,
        internalSearchState.searchQuery,
        internalSearchState.searchType,
        internalSearchState.searchCount,
        internalSearchState.searchFilter,
        internalSearchState.searchExplorationFactor,
        internalSearchState.filterExplorationFactor,
        internalSearchState.forceLinearScan,
        internalSearchState.noThread,
    ])

    // Helper function to parse count from string
    const parseCount = useCallback((countStr: string): number => {
        return parseInt(countStr, 10) || 10
    }, [])

    // Helper function to handle search errors
    const handleSearchError = useCallback(
        (error: unknown) => {
            // Extract the error message, ensuring we get the actual Redis error
            let errorMessage = "Search failed"
            let isFilterError = false

            if (error instanceof ApiError) {
                // Try to get the detailed error message
                errorMessage = error.message

                // Check if this is a filter syntax error
                isFilterError = error.data?.isFilterSyntaxError === true

                // Only log non-filter errors to avoid cluttering logs with user input validation errors
                if (!isFilterError) {
                    console.error("Search error:", error)
                    console.error("Full API error data:", error.data)
                }
            } else if (error instanceof Error) {
                errorMessage = error.message
                isFilterError = errorMessage.includes("syntax error in FILTER")

                // Only log non-filter errors
                if (!isFilterError) {
                    console.error("Search error:", error)
                }
            } else {
                errorMessage = String(error)
                isFilterError = errorMessage.includes("syntax error in FILTER")

                // Only log non-filter errors
                if (!isFilterError) {
                    console.error("Search error:", error)
                }
            }

            // Set the error state instead of using onStatusChange
            handleError(errorMessage)
            onSearchResults([])
        },
        [handleError, onSearchResults]
    )

    // Function to get vector from text using embedding API
    const getVectorFromText = useCallback(
        async (text: string): Promise<number[]> => {
            if (
                !metadata?.embedding ||
                metadata.embedding.provider === "none"
            ) {
                throw new Error(
                    "Please enter valid vector data (comma-separated numbers) or configure an embedding engine"
                )
            }

            const embedding = await embeddings.getEmbedding(
                metadata.embedding,
                text
            )

            if (!embedding.success || !embedding.result) {
                console.error("Error getting embedding", embedding)
                return []
            } else {
                return embedding.result
            }
        },
        [metadata]
    )

    // Handle Vector type search
    const handleVectorSearch = useCallback(
        async (count: number) => {
            if (!vectorSetName) return
            console.log(`[useVectorSearch] handleVectorSearch for type: ${internalSearchState.searchType}`)
            // Clear any previous errors when starting a new search
            clearError()

            let searchVector: number[]
            let searchString = ""

            // Try to parse as raw vector first
            const vectorData = internalSearchState.searchQuery
                .split(",")
                .map((n) => parseFloat(n.trim()))

            if (!vectorData.some(isNaN)) {
                // Valid vector data
                searchVector = vectorData
                
                // Set different message based on search type
                if (internalSearchState.searchType === "Multi-vector") {
                    console.log(`[useVectorSearch] Using combined vector for Multi-vector search. Length: ${searchVector.length}`)
                    searchString = "Results for Combined Vectors"
                } else {
                    // Set status message to show the first 3 numbers of the vector
                    const firstThreeNumbers = searchVector.slice(0, 3).join(", ")
                    searchString = `Results for Vector [${firstThreeNumbers}${searchVector.length > 3 ? "..." : ""
                        }]`
                }

                // Only clear lastTextEmbedding if we don't already have one that matches this vector
                // This preserves embeddings from images or text that were converted to vectors
                const currentEmbedding = internalSearchState.lastTextEmbedding
                const vectorsMatch = currentEmbedding && 
                    currentEmbedding.length === searchVector.length &&
                    currentEmbedding.every((val, idx) => Math.abs(val - searchVector[idx]) < 0.0001)
                
                if (!vectorsMatch) {
                    // This is a manually entered vector, clear the embedding
                    updateSearchState({ lastTextEmbedding: undefined })
                }
                // If vectors match, keep the existing lastTextEmbedding for comparison
            } else {
                // Not a valid vector, try to convert text to vector
                updateSearchState({ resultsTitle: "Getting embedding..." })
                searchVector = await getVectorFromText(
                    internalSearchState.searchQuery
                )
                searchString = `Results for "${internalSearchState.searchQuery}"`

                // Store the text embedding
                console.log("Setting lastTextEmbedding in useVectorSearch:", { 
                    length: searchVector.length,
                    firstFew: searchVector.slice(0, 5)
                });
                updateSearchState({ 
                    lastTextEmbedding: searchVector,
                    lastSearchDisplayName: internalSearchState.searchQuery // Set display name to the search text
                })
            }

            console.log("=============================================");
            console.log("SEARCH VECTOR DETAILS:");
            console.log(`Search type: ${internalSearchState.searchType}`);
            console.log(`Vector length: ${searchVector.length}`);
            console.log(`First 10 values: [${searchVector.slice(0, 10).join(", ")}${searchVector.length > 10 ? '...' : ''}]`);
            console.log(`Has lastTextEmbedding: ${!!internalSearchState.lastTextEmbedding}`);
            console.log("=============================================");

            // Perform vector-based search and measure time
            const vsimResponse = await vsim({
                keyName: vectorSetName!,
                searchVector,
                count,
                withEmbeddings: fetchEmbeddings,
                withAttribs: userSettings.getUseWithAttribs(),
                filter: internalSearchState.searchFilter,
                searchExplorationFactor: internalSearchState.searchExplorationFactor,
                filterExplorationFactor: internalSearchState.filterExplorationFactor,
                forceLinearScan: internalSearchState.forceLinearScan,
                noThread: internalSearchState.noThread,
                vectorFormat: internalSearchState.vectorFormat,
            })

            // Check if the search was successful
            if (!vsimResponse || !vsimResponse.success) {
                // Handle filter syntax errors specifically
                if (vsimResponse?.isFilterSyntaxError) {
                    handleError(vsimResponse.error || "Invalid filter syntax")
                } else {
                    handleError(vsimResponse?.error || "Vector search failed")
                }
                return
            }

            // Use the execution time from the server response
            if (vsimResponse.executionTimeMs) {
                const durationInSeconds = (
                    vsimResponse.executionTimeMs / 1000
                ).toFixed(4)
                updateSearchState({ searchTime: durationInSeconds })
            }

            // Update results title
            updateSearchState({ resultsTitle: searchString })

            // Process results
            onSearchResults(convertToVectorTuple(vsimResponse.result || []))

            onStatusChange(searchString)

            if (vsimResponse.executedCommand) {
                updateSearchState({ executedCommand: vsimResponse.executedCommand })
            }
        },
        [
            vectorSetName,
            internalSearchState.searchQuery,
            internalSearchState.searchType,
            internalSearchState.searchFilter,
            internalSearchState.searchExplorationFactor,
            internalSearchState.forceLinearScan,
            internalSearchState.noThread,
            internalSearchState.lastTextEmbedding,
            getVectorFromText,
            onSearchResults,
            onStatusChange,
            fetchEmbeddings,
            updateSearchState,
            clearError,
        ]
    )

    // Handle Element type search
    const handleElementSearch = useCallback(
        async (count: number) => {
            if (!vectorSetName) return

            // Clear any previous errors when starting a new search
            clearError()

            onStatusChange(`Element: "${internalSearchState.searchQuery}"`)

            const vsimResponse = await vsim({
                keyName: vectorSetName!,
                searchElement: internalSearchState.searchQuery,
                count,
                withEmbeddings: fetchEmbeddings,
                withAttribs: userSettings.getUseWithAttribs(),
                filter: internalSearchState.searchFilter,
                searchExplorationFactor: internalSearchState.searchExplorationFactor,
                filterExplorationFactor: internalSearchState.filterExplorationFactor,
                forceLinearScan: internalSearchState.forceLinearScan,
                noThread: internalSearchState.noThread,
                vectorFormat: internalSearchState.vectorFormat,
            })

            // Check if the search was successful
            if (!vsimResponse || !vsimResponse.success) {
                // Handle filter syntax errors specifically
                if (vsimResponse?.isFilterSyntaxError) {
                    handleError(vsimResponse.error || "Invalid filter syntax")
                } else {
                    handleError(vsimResponse?.error || "Element search failed")
                }
                return
            }

            // Use the execution time from the server response
            if (vsimResponse.executionTimeMs) {
                const durationInSeconds = (
                    vsimResponse.executionTimeMs / 1000
                ).toFixed(4)
                updateSearchState({ searchTime: durationInSeconds })
            }

            // Update results title
            updateSearchState({
                resultsTitle: `Results for "${internalSearchState.searchQuery}"`,
            })

            // Process results
            onSearchResults(convertToVectorTuple(vsimResponse.result || []))

            if (vsimResponse.executedCommand) {
                updateSearchState({ executedCommand: vsimResponse.executedCommand })
            }
        },
        [
            vectorSetName,
            internalSearchState.searchQuery,
            internalSearchState.searchFilter,
            internalSearchState.searchExplorationFactor,
            internalSearchState.forceLinearScan,
            internalSearchState.noThread,
            onSearchStateChange,
            onSearchResults,
            onStatusChange,
            fetchEmbeddings,
            clearError,
        ]
    )

    // Handle Image search type - using the vector embedding generated from the image
    const handleImageSearch = useCallback(
        async (count: number) => {
            if (!vectorSetName) return

            // Clear any previous errors when starting a new search
            clearError()

            try {
                // The searchQuery for images should already contain a vector representation
                // from the ImageUploader's onEmbeddingGenerated callback
                const vectorData = internalSearchState.searchQuery
                    .split(",")
                    .map((n) => parseFloat(n.trim()))

                // Check if we have valid vector data
                if (vectorData.some(isNaN)) {
                    //handleError("Invalid image embedding data")
                    return
                }

                // Check if the vector dimensions match the expected dimensions
                const expectedDimResponse = await vdim({ keyName: vectorSetName! })
                if (!expectedDimResponse.success || expectedDimResponse.result === undefined) {
                    handleError(expectedDimResponse.error || "Failed to get vector dimensions")
                    return
                }
                const expectedDim = expectedDimResponse.result

                // Log dimensions for debugging
                console.log(`Image embedding dimensions: ${vectorData.length}, Required: ${expectedDim}`)

                if (vectorData.length !== expectedDim) {
                    // Log detailed error
                    console.error(`Vector dimension mismatch: image embedding has ${vectorData.length} dimensions but vector set ${vectorSetName} requires ${expectedDim} dimensions`)
                    handleError(`Vector dimension mismatch: got ${vectorData.length}, need ${expectedDim}`)
                    return
                }

                // Set status message to show searching
                onStatusChange("Searching with image embedding...")
                updateSearchState({ resultsTitle: "Searching with image..." })

                // Perform vector-based search using the image embedding
                const vsimResponse = await vsim({
                    keyName: vectorSetName!,
                    searchVector: vectorData,
                    count,
                    withEmbeddings: fetchEmbeddings,
                    withAttribs: userSettings.getUseWithAttribs(),
                    filter: internalSearchState.searchFilter,
                    searchExplorationFactor: internalSearchState.searchExplorationFactor,
                    filterExplorationFactor: internalSearchState.filterExplorationFactor,
                    forceLinearScan: internalSearchState.forceLinearScan,
                    noThread: internalSearchState.noThread,
                    vectorFormat: internalSearchState.vectorFormat,
                })

                // Check if the search was successful
                if (!vsimResponse || !vsimResponse.success) {
                    // Handle filter syntax errors specifically
                    if (vsimResponse?.isFilterSyntaxError) {
                        handleError(vsimResponse.error || "Invalid filter syntax")
                    } else {
                        handleError(vsimResponse?.error || "Image search failed")
                    }
                    return
                }

                // Use the execution time from the server response
                if (vsimResponse.executionTimeMs) {
                    const durationInSeconds = (
                        vsimResponse.executionTimeMs / 1000
                    ).toFixed(4)
                    updateSearchState({ searchTime: durationInSeconds })
                }

                // Update results title
                updateSearchState({
                    resultsTitle: "Results for uploaded image"
                })

                // Process results
                onSearchResults(convertToVectorTuple(vsimResponse.result || []))
                onStatusChange("Image search complete")

                if (vsimResponse.executedCommand) {
                    updateSearchState({ executedCommand: vsimResponse.executedCommand })
                }
            } catch (error) {
                console.error("Image search error:", error)
                handleError(error instanceof Error ? error.message : String(error))
                onSearchResults([])
            }
        },
        [
            vectorSetName,
            internalSearchState.searchQuery,
            internalSearchState.searchFilter,
            internalSearchState.searchExplorationFactor,
            internalSearchState.forceLinearScan,
            internalSearchState.noThread,
            onSearchResults,
            onStatusChange,
            fetchEmbeddings,
            clearError,
            handleError,
            updateSearchState,
        ]
    )

    // Main search function
    const performSearch = useCallback(async () => {
        // Skip if no vector set or if nothing has changed since last search
        if (
            !vectorSetName ||
            (lastSearchRef.current.query === internalSearchState.searchQuery &&
                lastSearchRef.current.type === internalSearchState.searchType &&
                lastSearchRef.current.count ===
                internalSearchState.searchCount &&
                lastSearchRef.current.filter ===
                internalSearchState.searchFilter)
        ) {
            return
        }

        // Update last search state without modifying the filter
        lastSearchRef.current = {
            query: internalSearchState.searchQuery,
            type: internalSearchState.searchType,
            count: internalSearchState.searchCount,
            filter: internalSearchState.searchFilter,
        }

        setIsSearching(true)
        // Clear any previous errors when starting a new search
        clearError()

        const count = parseCount(internalSearchState.searchCount)

        try {
            // If we have no query but have a filter, use zero vector search
            if (
                (internalSearchState.searchType === "Vector" || 
                 internalSearchState.searchType === "Multi-vector") &&
                !internalSearchState.searchQuery.trim()
            ) {
                await performZeroVectorSearch(count)
            } else if (
                internalSearchState.searchType === "Vector" || 
                internalSearchState.searchType === "Multi-vector"
            ) {
                await handleVectorSearch(count)
            } else {
                await handleElementSearch(count)
            }
        } catch (error) {
            handleSearchError(error)
        } finally {
            setIsSearching(false)
        }
    }, [
        vectorSetName,
        internalSearchState,
        parseCount,
        handleSearchError,
        handleVectorSearch,
        handleElementSearch,
        handleImageSearch,
        performZeroVectorSearch,
        clearError,
    ])

    return {
        searchType: internalSearchState.searchType,
        setSearchType: (type) => updateSearchState({ searchType: type }),
        searchQuery: internalSearchState.searchQuery,
        setSearchQuery: (query) => updateSearchState({ searchQuery: query }),
        searchFilter: internalSearchState.searchFilter,
        setSearchFilter: (filter) => {
            // Update the internal state with the new filter
            updateSearchState({ searchFilter: filter })

            // Also update the lastSearchRef to prevent immediate re-search
            lastSearchRef.current = {
                ...lastSearchRef.current,
                filter: filter,
            }
        },
        searchCount: internalSearchState.searchCount,
        setSearchCount: (count) => updateSearchState({ searchCount: count }),
        isSearching,
        resultsTitle: internalSearchState.resultsTitle,
        setResultsTitle: (title) => updateSearchState({ resultsTitle: title }),
        searchTime: internalSearchState.searchTime,
        error, // Expose error state
        clearError, // Expose function to clear errors
        searchExplorationFactor: internalSearchState.searchExplorationFactor,
        setSearchExplorationFactor: (value) =>
            updateSearchState({ searchExplorationFactor: value }),
        filterExplorationFactor: internalSearchState.filterExplorationFactor,
        setFilterExplorationFactor: (value) =>
            updateSearchState({ filterExplorationFactor: value }),
        forceLinearScan: internalSearchState.forceLinearScan,
        setForceLinearScan: (value) => {
            console.log("CHANGED", value)
            updateSearchState({ forceLinearScan: value })
        },
        noThread: internalSearchState.noThread,
        setNoThread: (value) => {
            updateSearchState({ noThread: value })
        },
        lastTextEmbedding: internalSearchState.lastTextEmbedding, // Expose the last text embedding
        setLastTextEmbedding: (embedding) => updateSearchState({ lastTextEmbedding: embedding }),
        lastSearchDisplayName: internalSearchState.lastSearchDisplayName,
        setLastSearchDisplayName: (name) => updateSearchState({ lastSearchDisplayName: name }),
        executedCommand: internalSearchState.executedCommand,
        vectorFormat: internalSearchState.vectorFormat,
        setVectorFormat: (format) => {
            updateSearchState({ vectorFormat: format })
        },
    }
}
