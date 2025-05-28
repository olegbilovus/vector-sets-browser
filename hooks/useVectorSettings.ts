import { useState, useEffect } from 'react'
import { VectorSetMetadata } from '@/lib/types/vectors'
import { isImageEmbedding, isMultiModalEmbedding } from '@/lib/embeddings/types/embeddingModels'

export type ColorScheme = 'thermal' | 'viridis' | 'classic'
export type ScalingMode = 'relative' | 'absolute'
export type VisualizationType = 'heatmap' | 'distribution' | 'radial'

interface VectorSettings {
    colorScheme: ColorScheme
    scalingMode: ScalingMode
    visualizationType: VisualizationType
}

// Default settings for text vectors
const DEFAULT_TEXT_SETTINGS: VectorSettings = {
    colorScheme: 'thermal',
    scalingMode: 'relative',
    visualizationType: 'radial'
}

// Default settings for image/multimodal vectors
const DEFAULT_IMAGE_SETTINGS: VectorSettings = {
    colorScheme: 'thermal',
    scalingMode: 'relative',
    visualizationType: 'heatmap'
}

const GLOBAL_STORAGE_KEY = 'vector-visualization-settings'
const VECTORSET_STORAGE_PREFIX = 'vector-visualization-settings-'
const DEFAULT_SETTINGS_KEY = 'vector-visualization-default-settings'

// Helper function to determine if a vectorset is image/multimodal based
function isImageBasedVectorSet(metadata: VectorSetMetadata | null): boolean {
    if (!metadata?.embedding) return false
    return isImageEmbedding(metadata.embedding) || isMultiModalEmbedding(metadata.embedding)
}

// Helper function to get default settings based on vectorset type
function getDefaultSettings(metadata: VectorSetMetadata | null): VectorSettings {
    return isImageBasedVectorSet(metadata) ? DEFAULT_IMAGE_SETTINGS : DEFAULT_TEXT_SETTINGS
}

export function useVectorSettings(vectorSetName?: string | null, metadata?: VectorSetMetadata | null) {
    const defaultSettings = getDefaultSettings(metadata)
    const [settings, setSettings] = useState<VectorSettings>(defaultSettings)

    // Get storage key for this vectorset
    const getStorageKey = () => {
        return vectorSetName ? `${VECTORSET_STORAGE_PREFIX}${vectorSetName}` : GLOBAL_STORAGE_KEY
    }

    // Load settings from localStorage
    const loadSettings = () => {
        try {
            const storageKey = getStorageKey()
            const stored = localStorage.getItem(storageKey)
            
            if (stored) {
                // Use stored settings for this specific vectorset
                const parsed = JSON.parse(stored)
                setSettings({ ...defaultSettings, ...parsed })
            } else {
                // Check for custom default settings
                const customDefaults = localStorage.getItem(DEFAULT_SETTINGS_KEY)
                if (customDefaults) {
                    try {
                        const parsedDefaults = JSON.parse(customDefaults)
                        const isImageBased = isImageBasedVectorSet(metadata)
                        const typeKey = isImageBased ? 'image' : 'text'
                        
                        if (parsedDefaults[typeKey]) {
                            setSettings({ ...defaultSettings, ...parsedDefaults[typeKey] })
                            return
                        }
                    } catch (e) {
                        console.warn('Failed to parse custom default settings:', e)
                    }
                }
                
                // Fall back to built-in defaults
                setSettings(defaultSettings)
            }
        } catch (error) {
            console.warn('Failed to load vector settings from localStorage:', error)
            setSettings(defaultSettings)
        }
    }

    // Load settings on mount and when vectorset or metadata changes
    useEffect(() => {
        loadSettings()
    }, [vectorSetName, metadata])

    // Listen for storage changes from other components/tabs
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            const storageKey = getStorageKey()
            if (e.key === storageKey) {
                loadSettings()
            }
        }

        // Listen for changes from other components in the same tab
        const handleCustomStorageChange = () => {
            loadSettings()
        }

        window.addEventListener('storage', handleStorageChange)
        window.addEventListener('vector-settings-changed', handleCustomStorageChange)

        return () => {
            window.removeEventListener('storage', handleStorageChange)
            window.removeEventListener('vector-settings-changed', handleCustomStorageChange)
        }
    }, [vectorSetName])

    // Save settings to localStorage whenever they change
    const updateSettings = (newSettings: Partial<VectorSettings>) => {
        const updated = { ...settings, ...newSettings }
        setSettings(updated)
        
        try {
            const storageKey = getStorageKey()
            localStorage.setItem(storageKey, JSON.stringify(updated))
            // Dispatch custom event to notify other components in the same tab
            window.dispatchEvent(new Event('vector-settings-changed'))
        } catch (error) {
            console.warn('Failed to save vector settings to localStorage:', error)
        }
    }

    // Reset to defaults for this vectorset type
    const resetToDefaults = () => {
        const storageKey = getStorageKey()
        try {
            localStorage.removeItem(storageKey)
            setSettings(defaultSettings)
            window.dispatchEvent(new Event('vector-settings-changed'))
        } catch (error) {
            console.warn('Failed to reset vector settings:', error)
        }
    }

    // Make current settings the default for all vectorsets of this type
    const makeDefault = () => {
        try {
            const isImageBased = isImageBasedVectorSet(metadata)
            const typeKey = isImageBased ? 'image' : 'text'
            
            // Get existing custom defaults or create new object
            let customDefaults = {}
            try {
                const existing = localStorage.getItem(DEFAULT_SETTINGS_KEY)
                if (existing) {
                    customDefaults = JSON.parse(existing)
                }
            } catch (e) {
                console.warn('Failed to parse existing default settings:', e)
            }
            
            // Update the defaults for this type
            customDefaults = {
                ...customDefaults,
                [typeKey]: settings
            }
            
            localStorage.setItem(DEFAULT_SETTINGS_KEY, JSON.stringify(customDefaults))
            window.dispatchEvent(new Event('vector-settings-changed'))
            
            return true
        } catch (error) {
            console.warn('Failed to save default vector settings:', error)
            return false
        }
    }

    // Reset to built-in defaults and clear custom defaults
    const resetToBuiltInDefaults = () => {
        try {
            const isImageBased = isImageBasedVectorSet(metadata)
            const typeKey = isImageBased ? 'image' : 'text'
            
            // Clear custom defaults for this type
            let customDefaults = {}
            try {
                const existing = localStorage.getItem(DEFAULT_SETTINGS_KEY)
                if (existing) {
                    customDefaults = JSON.parse(existing)
                    delete customDefaults[typeKey]
                    
                    if (Object.keys(customDefaults).length === 0) {
                        localStorage.removeItem(DEFAULT_SETTINGS_KEY)
                    } else {
                        localStorage.setItem(DEFAULT_SETTINGS_KEY, JSON.stringify(customDefaults))
                    }
                }
            } catch (e) {
                console.warn('Failed to clear custom defaults:', e)
            }
            
            // Clear vectorset-specific settings and reset to built-in defaults
            const storageKey = getStorageKey()
            localStorage.removeItem(storageKey)
            setSettings(defaultSettings)
            window.dispatchEvent(new Event('vector-settings-changed'))
        } catch (error) {
            console.warn('Failed to reset vector settings:', error)
        }
    }

    return {
        settings,
        updateSettings,
        resetToDefaults,
        makeDefault,
        resetToBuiltInDefaults,
        isImageBased: isImageBasedVectorSet(metadata),
        setColorScheme: (colorScheme: ColorScheme) => updateSettings({ colorScheme }),
        setScalingMode: (scalingMode: ScalingMode) => updateSettings({ scalingMode }),
        setVisualizationType: (visualizationType: VisualizationType) => updateSettings({ visualizationType })
    }
} 