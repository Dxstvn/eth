"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"

interface EmailProvider {
  name: string
  domain: string
  url: string
  icon?: string
  color?: string
}

const emailProviders: EmailProvider[] = [
  {
    name: "Gmail",
    domain: "gmail.com",
    url: "https://mail.google.com",
    color: "#EA4335"
  },
  {
    name: "Outlook",
    domain: "outlook.com",
    url: "https://outlook.live.com",
    color: "#0078D4"
  },
  {
    name: "Hotmail",
    domain: "hotmail.com",
    url: "https://outlook.live.com",
    color: "#0078D4"
  },
  {
    name: "Yahoo",
    domain: "yahoo.com",
    url: "https://mail.yahoo.com",
    color: "#6001D2"
  },
  {
    name: "iCloud",
    domain: "icloud.com",
    url: "https://www.icloud.com/mail",
    color: "#007AFF"
  },
  {
    name: "ProtonMail",
    domain: "protonmail.com",
    url: "https://mail.protonmail.com",
    color: "#6D4AFF"
  },
  {
    name: "ProtonMail",
    domain: "proton.me",
    url: "https://mail.proton.me",
    color: "#6D4AFF"
  }
]

interface CheckYourEmailComponentProps {
  email: string
  showTitle?: boolean
  className?: string
}

export default function CheckYourEmailComponent({ 
  email, 
  showTitle = true,
  className 
}: CheckYourEmailComponentProps) {
  const detectedProvider = useMemo(() => {
    const domain = email.split("@")[1]?.toLowerCase()
    return emailProviders.find(provider => 
      domain?.includes(provider.domain)
    )
  }, [email])

  if (!detectedProvider) {
    return null
  }

  return (
    <div className={className}>
      {showTitle && (
        <p className="text-sm text-neutral-600 mb-2">
          Open your email:
        </p>
      )}
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={() => window.open(detectedProvider.url, "_blank")}
      >
        <span className="flex items-center">
          <span 
            className="w-2 h-2 rounded-full mr-2" 
            style={{ backgroundColor: detectedProvider.color }}
          />
          Open {detectedProvider.name}
        </span>
        <ExternalLink className="h-4 w-4 ml-2" />
      </Button>
    </div>
  )
}