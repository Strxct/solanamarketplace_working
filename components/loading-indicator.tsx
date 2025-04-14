"use client"

import type React from "react"
import { motion } from "framer-motion"

interface LoadingIndicatorProps {
  message?: string
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ message = "Loading..." }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 h-full">
      <div className="relative">
        <motion.div
          className="h-16 w-16 rounded-full border-4 border-primary/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        />
        <motion.div
          className="absolute top-0 left-0 h-16 w-16 rounded-full border-t-4 border-r-4 border-primary"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        />
      </div>
      <motion.p
        className="mt-4 text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {message}
      </motion.p>
    </div>
  )
}

export default LoadingIndicator
