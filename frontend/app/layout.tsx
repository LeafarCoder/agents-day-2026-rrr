import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'B Planner — Your Plan B for {city}',
  description: 'GPS-triggered travel itinerary app. Get a personalized plan in seconds.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#0a0a0a] text-white min-h-screen`}>
        <div className="max-w-md mx-auto min-h-screen relative">
          {children}
        </div>
      </body>
    </html>
  )
}
