import type { Metadata } from "next"
import "@groucho/sdk/groucho.css"
import "./globals.css"

export const metadata: Metadata = {
  title: "Groucho SDK — proxy example",
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
