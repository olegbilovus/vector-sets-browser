import { useState, useEffect, useRef } from 'react'
import { useAnimationSettings } from '@/app/config/AnimationSettings'

interface UseTypingAnimationOptions {
    text: string
    speed?: number // milliseconds per character
    enabled?: boolean
}

export function useTypingAnimation({ 
    text, 
    speed = 20, 
    enabled = true 
}: UseTypingAnimationOptions) {
    const [displayedText, setDisplayedText] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const { animationsDisabled } = useAnimationSettings()

    useEffect(() => {
        // Clear any existing interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
        }

        // If animations are disabled or typing is disabled, show full text immediately
        if (animationsDisabled || !enabled) {
            setDisplayedText(text)
            setIsTyping(false)
            return
        }

        // If text is empty, reset displayed text
        if (!text) {
            setDisplayedText('')
            setIsTyping(false)
            return
        }

        // Start typing animation
        setIsTyping(true)
        setDisplayedText('')
        
        let currentIndex = 0
        
        intervalRef.current = setInterval(() => {
            if (currentIndex <= text.length) {
                setDisplayedText(text.slice(0, currentIndex))
                currentIndex++
            } else {
                setIsTyping(false)
                if (intervalRef.current) {
                    clearInterval(intervalRef.current)
                    intervalRef.current = null
                }
            }
        }, speed)

        // Cleanup function
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }
    }, [text, speed, enabled, animationsDisabled])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [])

    return {
        displayedText,
        isTyping,
        // Function to skip animation and show full text immediately
        skipAnimation: () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
            setDisplayedText(text)
            setIsTyping(false)
        }
    }
} 