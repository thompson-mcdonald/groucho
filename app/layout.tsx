import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Groucho Demo",
  description: "Demo for Postern's Groucho",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
