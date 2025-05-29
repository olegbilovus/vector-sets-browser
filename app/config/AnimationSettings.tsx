"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { userSettings } from "@/lib/storage/userSettings"
import { useState, useEffect } from "react"

const ANIMATIONS_DISABLED_KEY = 'animations-disabled'

export default function AnimationSettings() {
    const [animationsDisabled, setAnimationsDisabled] = useState(true) // Default to disabled
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        // Load the setting from localStorage
        const storedValue = userSettings.get<boolean>(ANIMATIONS_DISABLED_KEY)
        setAnimationsDisabled(storedValue ?? true) // Default to disabled if not set
        setIsLoaded(true)
    }, [])

    const handleToggle = (checked: boolean) => {
        setAnimationsDisabled(checked)
        userSettings.set(ANIMATIONS_DISABLED_KEY, checked)
    }

    if (!isLoaded) {
        return null // Don't render until loaded to prevent flash
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Animation Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                    <Switch
                        id="disable-animations"
                        checked={animationsDisabled}
                        onCheckedChange={handleToggle}
                    />
                    <Label htmlFor="disable-animations">
                        Disable animations
                    </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                    When enabled, disables typing animations and other UI animations for a more static interface.
                </p>
            </CardContent>
        </Card>
    )
}

// Export the hook to be used by other components
export function useAnimationSettings() {
    const [animationsDisabled, setAnimationsDisabled] = useState(true)
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        const storedValue = userSettings.get<boolean>(ANIMATIONS_DISABLED_KEY)
        setAnimationsDisabled(storedValue ?? true)
        setIsLoaded(true)

        // Listen for storage changes
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === `user-settings:${ANIMATIONS_DISABLED_KEY}`) {
                const newValue = e.newValue ? JSON.parse(e.newValue) : true
                setAnimationsDisabled(newValue)
            }
        }

        window.addEventListener('storage', handleStorageChange)
        return () => window.removeEventListener('storage', handleStorageChange)
    }, [])

    return { animationsDisabled, isLoaded }
} 