"use client"

import { useState, useEffect, useCallback } from 'react'
import { userSettings } from '@/lib/storage/userSettings'

export function useSidebarToggle() {
    const [isCollapsed, setIsCollapsed] = useState<boolean>(false)
    const [isLoaded, setIsLoaded] = useState<boolean>(false)

    // Load the initial state from localStorage
    useEffect(() => {
        const storedValue = userSettings.getSidebarCollapsed()
        setIsCollapsed(storedValue)
        setIsLoaded(true)
    }, [])

    // Toggle function that persists the state
    const toggleSidebar = useCallback(() => {
        const newState = !isCollapsed
        setIsCollapsed(newState)
        userSettings.setSidebarCollapsed(newState)
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('sidebar-toggle-changed', {
            detail: { isCollapsed: newState }
        }))
    }, [isCollapsed])

    // Function to set specific state
    const setSidebarCollapsed = useCallback((collapsed: boolean) => {
        setIsCollapsed(collapsed)
        userSettings.setSidebarCollapsed(collapsed)
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('sidebar-toggle-changed', {
            detail: { isCollapsed: collapsed }
        }))
    }, [])

    return {
        isCollapsed,
        isLoaded,
        toggleSidebar,
        setSidebarCollapsed
    }
}
