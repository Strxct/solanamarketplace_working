import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "react-hot-toast"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SolanaWalletProvider } from "@/contexts/solana-wallet-context"
import Navbar from "@/components/navbar"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "WorldNFT Solana Drops",
  description: "Mint and collect NFTs on Solana",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-background min-h-screen`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <SolanaWalletProvider>
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
            </div>
            <Toaster position="bottom-right" />
          </SolanaWalletProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}


import './globals.css'