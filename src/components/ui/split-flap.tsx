"use client"

import type React from "react"
import { motion } from "framer-motion"
import { useMemo, useState, useCallback, useEffect, useRef, createContext, useContext, useSyncExternalStore } from "react"
import { Volume2, VolumeX } from "lucide-react"

interface AudioContextType {
  isMuted: boolean
  toggleMute: () => void
  playClick: () => void
}

const SplitFlapAudioContext = createContext<AudioContextType | null>(null)

export function useSplitFlapAudio() {
  return useContext(SplitFlapAudioContext)
}

export function SplitFlapAudioProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(true)
  const audioContextRef = useRef<AudioContext | null>(null)

  const getAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass()
      }
    }
    return audioContextRef.current
  }, [])

  const triggerHaptic = useCallback(() => {
    if (isMuted) return
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10)
    }
  }, [isMuted])

  const playClick = useCallback(() => {
    if (isMuted) return

    triggerHaptic()

    try {
      const ctx = getAudioContext()
      if (!ctx) return

      if (ctx.state === "suspended") {
        ctx.resume()
      }

      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      const filter = ctx.createBiquadFilter()
      const lowpass = ctx.createBiquadFilter()

      oscillator.type = "square"
      oscillator.frequency.setValueAtTime(800 + Math.random() * 400, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.015)

      filter.type = "bandpass"
      filter.frequency.setValueAtTime(1200, ctx.currentTime)
      filter.Q.setValueAtTime(0.8, ctx.currentTime)

      lowpass.type = "lowpass"
      lowpass.frequency.value = 2500
      lowpass.Q.value = 0.5

      gainNode.gain.setValueAtTime(0.05, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02)

      oscillator.connect(filter)
      filter.connect(gainNode)
      gainNode.connect(lowpass)
      lowpass.connect(ctx.destination)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.02)
    } catch {
      // Audio not supported
    }
  }, [isMuted, getAudioContext, triggerHaptic])

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev)
    if (isMuted) {
      try {
        const ctx = getAudioContext()
        if (ctx && ctx.state === "suspended") {
          ctx.resume()
        }
      } catch {
        // Audio not supported
      }
    }
  }, [isMuted, getAudioContext])

  const value = useMemo(() => ({ isMuted, toggleMute, playClick }), [isMuted, toggleMute, playClick])

  return <SplitFlapAudioContext.Provider value={value}>{children}</SplitFlapAudioContext.Provider>
}

export function SplitFlapMuteToggle({ className = "" }: { className?: string }) {
  const audio = useSplitFlapAudio()
  if (!audio) return null

  return (
    <button
      onClick={audio.toggleMute}
      className={`inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors duration-200 ${className}`}
      aria-label={audio.isMuted ? "Unmute sound effects" : "Mute sound effects"}
    >
      {audio.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      <span>{audio.isMuted ? "Sound Off" : "Sound On"}</span>
    </button>
  )
}

interface SplitFlapTextProps {
  text: string
  className?: string
  speed?: number
  minLength?: number
  padDirection?: 'left' | 'right'
}

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:!/- ".split("")

function SplitFlapTextInner({ text, className = "", speed = 50, minLength, padDirection = 'right' }: SplitFlapTextProps) {
  const chars = useMemo(() => {
    let processedText = text;
    if (minLength && text.length < minLength) {
        if (padDirection === 'left') {
            processedText = text.padStart(minLength, " ");
        } else {
            processedText = text.padEnd(minLength, " ");
        }
    }
    return processedText.split("");
  }, [text, minLength, padDirection])
  
  const [animationKey, setAnimationKey] = useState(0)
  // Use useSyncExternalStore for hydration mismatch prevention without cascading renders
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
  const audio = useSplitFlapAudio()

  const handleMouseEnter = useCallback(() => {
    setAnimationKey((prev) => prev + 1)
  }, [])

  // Don't render until mounted to prevent hydration animation restart
  if (!isMounted) {
    return (
      <div
        className={`inline-flex items-center ${className}`}
        aria-label={text}
        style={{ perspective: "1000px" }}
      >
        {chars.map((char, index) => (
          <div
            key={index}
            className="relative overflow-hidden flex items-center justify-center font-mono bg-black"
            style={{
              fontSize: "clamp(1.5rem, 3vw, 3.5rem)", 
              width: "0.75em",
              height: "1.1em",
            }}
          >
            <span className="font-bold text-zinc-600">{char.toUpperCase()}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className={`inline-flex items-center cursor-pointer ${className}`}
      aria-label={text}
      onMouseEnter={handleMouseEnter}
      style={{ perspective: "1000px" }}
    >
      {chars.map((char, index) => (
        <SplitFlapChar
          key={`${index}-${char}`}
          char={char.toUpperCase()}
          index={index}
          animationKey={animationKey}
          skipEntrance={true}
          speed={speed}
          playClick={audio?.playClick}
        />
      ))}
    </div>
  )
}

export function SplitFlapText(props: SplitFlapTextProps) {
  return <SplitFlapTextInner {...props} />
}

interface SplitFlapCharProps {
  char: string
  index: number
  animationKey: number
  skipEntrance: boolean
  speed: number
  playClick?: () => void
}

function SplitFlapChar({ char, index, animationKey, skipEntrance, speed, playClick }: SplitFlapCharProps) {
  const displayChar = CHARSET.includes(char) ? char : " "
  const isSpace = char === " "
  const [currentChar, setCurrentChar] = useState(skipEntrance ? displayChar : " ")
  const [isSettled, setIsSettled] = useState(skipEntrance)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const tileDelay = 0.15 * index

  // Colors: Transparent background, clean text
  const bgColor = "transparent"
  const textColor = isSettled ? "#e5e5e5" : "#f97316" // White settled, Orange flipping

  // Reset when target char changes or animation key triggers
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    // Initial state for this animation
    setIsSettled(false)
    
    const baseFlips = 8
    // If it's a re-render from prop change (live update), fast delay. If initial load, staggered delay.
    const startDelay = skipEntrance ? (index * 20) : (tileDelay * 800)
    
    let flipIndex = 0

    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        const settleThreshold = baseFlips + 0

        // Random char flip
        setCurrentChar(CHARSET[Math.floor(Math.random() * CHARSET.length)])
        if (flipIndex % 2 === 0 && playClick) playClick()
        flipIndex++

        // Check if we should settle
        if (flipIndex >= settleThreshold) {
             if (intervalRef.current) clearInterval(intervalRef.current)
             setCurrentChar(displayChar)
             setIsSettled(true)
             if (playClick) playClick()
        }
      }, speed)
    }, startDelay)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [displayChar, animationKey, index, speed, playClick, skipEntrance, tileDelay])

  if (isSpace && isSettled) {
    // Render an empty block but with same dimensions/style to maintain grid
  }

  return (
    <motion.div
      initial={skipEntrance ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: tileDelay, duration: 0.3, ease: "easeOut" }}
      className="relative overflow-hidden flex items-center justify-center font-mono"
      style={{
        fontSize: "clamp(1.5rem, 3vw, 3.5rem)", 
        width: "0.75em",
        height: "1.1em",
        backgroundColor: bgColor,
        transformStyle: "preserve-3d",
        transition: "background-color 0.15s ease",
      }}
    >
      {/* Top Half */}
      <div className="absolute inset-x-0 top-0 bottom-1/2 flex items-end justify-center overflow-hidden">
        <span
          className="block translate-y-[0.52em] leading-none font-bold"
          style={{ color: textColor }} 
        >
          {currentChar}
        </span>
      </div>

      {/* Bottom Half */}
      <div className="absolute inset-x-0 top-1/2 bottom-0 flex items-start justify-center overflow-hidden">
        <span
          className="-translate-y-[0.52em] leading-none font-bold"
          style={{ color: textColor }}
        >
          {currentChar}
        </span>
      </div>

      {/* Flapping Part (Animation) */}
      {!isSettled && (
          <motion.div
            key={`${animationKey}-${currentChar}`} 
            initial={{ rotateX: -90 }}
            animate={{ rotateX: 0 }}
            transition={{
              duration: speed / 1000,
              ease: "linear",
            }}
            className="absolute inset-x-0 top-0 bottom-1/2 origin-bottom overflow-hidden"
            style={{
              transformStyle: "preserve-3d",
              backfaceVisibility: "hidden",
            }}
          >
            <div className="flex h-full items-end justify-center">
              <span
                className="translate-y-[0.52em] leading-none font-bold"
                style={{ color: textColor }}
              >
                {currentChar}
              </span>
            </div>
          </motion.div>
      )}

    </motion.div>
  )
}
