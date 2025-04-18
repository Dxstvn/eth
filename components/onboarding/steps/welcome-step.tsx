"use client"

import { useAuth } from "@/context/auth-context"

export default function WelcomeStep() {
  const { user } = useAuth()

  // Get user's first name from email
  const firstName = user?.email
    ? user.email.split("@")[0].split(".")[0].charAt(0).toUpperCase() + user.email.split("@")[0].split(".")[0].slice(1)
    : "there"

  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-24 h-24 rounded-full bg-teal-100 flex items-center justify-center text-teal-800 mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <h2 className="text-3xl font-bold text-teal-900 mb-4 font-display">Welcome to CryptoEscrow, {firstName}!</h2>
      <p className="text-lg text-neutral-600 max-w-2xl mb-6">
        We're excited to have you on board. Let's take a quick tour to help you get started with secure real estate
        transactions using cryptocurrency.
      </p>

      {/* Custom SVG illustration */}
      <div className="w-full max-w-lg mx-auto">
        <svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
          {/* Background */}
          <rect x="0" y="0" width="800" height="400" fill="#f0fdfa" rx="20" ry="20" />

          {/* House */}
          <g transform="translate(100, 100)">
            <rect x="50" y="100" width="200" height="150" fill="#ffffff" stroke="#1a3c34" strokeWidth="4" />
            <polygon points="150,30 50,100 250,100" fill="#ffffff" stroke="#1a3c34" strokeWidth="4" />
            <rect x="120" y="170" width="60" height="80" fill="#1a3c34" />
            <rect x="70" y="130" width="40" height="40" fill="#ffffff" stroke="#1a3c34" strokeWidth="2" />
            <rect x="190" y="130" width="40" height="40" fill="#ffffff" stroke="#1a3c34" strokeWidth="2" />
          </g>

          {/* Blockchain */}
          <g transform="translate(450, 120)">
            <rect x="0" y="0" width="60" height="60" fill="#ffffff" stroke="#1a3c34" strokeWidth="3" rx="5" ry="5" />
            <rect x="80" y="0" width="60" height="60" fill="#ffffff" stroke="#1a3c34" strokeWidth="3" rx="5" ry="5" />
            <rect x="160" y="0" width="60" height="60" fill="#ffffff" stroke="#1a3c34" strokeWidth="3" rx="5" ry="5" />
            <rect x="40" y="80" width="60" height="60" fill="#ffffff" stroke="#1a3c34" strokeWidth="3" rx="5" ry="5" />
            <rect x="120" y="80" width="60" height="60" fill="#ffffff" stroke="#1a3c34" strokeWidth="3" rx="5" ry="5" />
            <rect x="0" y="160" width="60" height="60" fill="#ffffff" stroke="#1a3c34" strokeWidth="3" rx="5" ry="5" />
            <rect x="80" y="160" width="60" height="60" fill="#ffffff" stroke="#1a3c34" strokeWidth="3" rx="5" ry="5" />
            <rect
              x="160"
              y="160"
              width="60"
              height="60"
              fill="#ffffff"
              stroke="#1a3c34"
              strokeWidth="3"
              rx="5"
              ry="5"
            />

            {/* Blockchain connections */}
            <line x1="60" y1="30" x2="80" y2="30" stroke="#1a3c34" strokeWidth="3" />
            <line x1="140" y1="30" x2="160" y2="30" stroke="#1a3c34" strokeWidth="3" />
            <line x1="30" y1="60" x2="30" y2="80" stroke="#d4af37" strokeWidth="3" />
            <line x1="110" y1="60" x2="110" y2="80" stroke="#d4af37" strokeWidth="3" />
            <line x1="190" y1="60" x2="190" y2="80" stroke="#d4af37" strokeWidth="3" />
            <line x1="70" y1="110" x2="120" y2="110" stroke="#1a3c34" strokeWidth="3" />
            <line x1="30" y1="140" x2="30" y2="160" stroke="#d4af37" strokeWidth="3" />
            <line x1="110" y1="140" x2="110" y2="160" stroke="#d4af37" strokeWidth="3" />
            <line x1="60" y1="190" x2="80" y2="190" stroke="#1a3c34" strokeWidth="3" />
            <line x1="140" y1="190" x2="160" y2="190" stroke="#1a3c34" strokeWidth="3" />

            {/* Blockchain icons */}
            <text x="30" y="35" fontSize="24" fill="#d4af37" textAnchor="middle">
              ₿
            </text>
            <text x="110" y="35" fontSize="24" fill="#d4af37" textAnchor="middle">
              Ξ
            </text>
            <text x="190" y="35" fontSize="24" fill="#d4af37" textAnchor="middle">
              ₿
            </text>
            <text x="70" y="115" fontSize="24" fill="#d4af37" textAnchor="middle">
              Ξ
            </text>
            <text x="150" y="115" fontSize="24" fill="#d4af37" textAnchor="middle">
              ₿
            </text>
            <text x="30" y="195" fontSize="24" fill="#d4af37" textAnchor="middle">
              ₿
            </text>
            <text x="110" y="195" fontSize="24" fill="#d4af37" textAnchor="middle">
              Ξ
            </text>
            <text x="190" y="195" fontSize="24" fill="#d4af37" textAnchor="middle">
              ₿
            </text>
          </g>

          {/* Connection line between house and blockchain */}
          <path d="M300,175 C350,175 350,175 400,175" stroke="#1a3c34" strokeWidth="4" strokeDasharray="10,5" />
          <circle cx="350" cy="175" r="15" fill="#d4af37" />
          <text x="350" y="180" fontSize="16" fill="#ffffff" textAnchor="middle">
            $
          </text>
        </svg>
      </div>
    </div>
  )
}
