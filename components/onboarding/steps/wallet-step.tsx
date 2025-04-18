export default function WalletStep() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
      <div>
        <div className="w-16 h-16 rounded-full bg-gold-100 flex items-center justify-center text-gold-600 mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-teal-900 mb-4 font-display">Connect Your Wallet</h2>
        <p className="text-neutral-600 mb-4">
          Connect your cryptocurrency wallet to start using CryptoEscrow. We support popular wallets like MetaMask and
          Coinbase Wallet.
        </p>
        <ul className="space-y-2 mb-6">
          <li className="flex items-start">
            <div className="rounded-full bg-teal-100 p-1 mr-3 mt-0.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-teal-700"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span>Securely connect without sharing your private keys</span>
          </li>
          <li className="flex items-start">
            <div className="rounded-full bg-teal-100 p-1 mr-3 mt-0.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-teal-700"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span>Sign transactions directly through your wallet</span>
          </li>
          <li className="flex items-start">
            <div className="rounded-full bg-teal-100 p-1 mr-3 mt-0.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-teal-700"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span>Connect multiple wallets for different transactions</span>
          </li>
        </ul>
      </div>
      <div className="relative rounded-lg overflow-hidden shadow-lg border border-neutral-200 p-4 bg-white">
        {/* Custom SVG illustration */}
        <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
          {/* User */}
          <g transform="translate(50, 150)">
            <circle cx="0" cy="0" r="40" fill="#1a3c34" />
            <circle cx="0" cy="-15" r="15" fill="#ffffff" />
            <path d="M-20,15 C-20,40 20,40 20,15 Z" fill="#ffffff" />
          </g>

          {/* Connection */}
          <g>
            <path d="M90,150 C120,150 130,100 160,100" stroke="#d4af37" strokeWidth="4" strokeDasharray="7,3" />
            <circle cx="160" cy="100" r="10" fill="#d4af37" />
            <path d="M180,100 C210,100 220,150 250,150" stroke="#d4af37" strokeWidth="4" strokeDasharray="7,3" />
            <circle cx="250" cy="150" r="10" fill="#d4af37" />
          </g>

          {/* Wallets */}
          <g transform="translate(300, 150)">
            {/* MetaMask Wallet */}
            <rect
              x="-40"
              y="-60"
              width="80"
              height="120"
              rx="10"
              ry="10"
              fill="#ffffff"
              stroke="#1a3c34"
              strokeWidth="3"
            />
            <circle cx="0" cy="-30" r="20" fill="#d4af37" />
            <text x="0" y="-25" fontSize="20" fill="#1a3c34" textAnchor="middle">
              M
            </text>
            <rect x="-30" y="0" width="60" height="10" rx="5" ry="5" fill="#1a3c34" />
            <rect x="-30" y="20" width="60" height="10" rx="5" ry="5" fill="#1a3c34" />
            <rect x="-30" y="40" width="60" height="10" rx="5" ry="5" fill="#1a3c34" />

            {/* Coinbase Wallet */}
            <rect
              x="-40"
              y="-180"
              width="80"
              height="120"
              rx="10"
              ry="10"
              fill="#ffffff"
              stroke="#1a3c34"
              strokeWidth="3"
            />
            <circle cx="0" cy="-150" r="20" fill="#1a3c34" />
            <text x="0" y="-145" fontSize="20" fill="#d4af37" textAnchor="middle">
              C
            </text>
            <rect x="-30" y="-120" width="60" height="10" rx="5" ry="5" fill="#1a3c34" />
            <rect x="-30" y="-100" width="60" height="10" rx="5" ry="5" fill="#1a3c34" />
            <rect x="-30" y="-80" width="60" height="10" rx="5" ry="5" fill="#1a3c34" />
          </g>

          {/* Lock icons */}
          <g>
            <circle cx="160" cy="50" r="15" fill="#f0fdfa" stroke="#1a3c34" strokeWidth="2" />
            <rect x="155" y="45" width="10" height="15" rx="2" ry="2" fill="#1a3c34" />
            <circle cx="160" cy="200" r="15" fill="#f0fdfa" stroke="#1a3c34" strokeWidth="2" />
            <rect x="155" y="195" width="10" height="15" rx="2" ry="2" fill="#1a3c34" />
          </g>

          {/* Connection lines */}
          <line x1="160" y1="65" x2="160" y2="90" stroke="#1a3c34" strokeWidth="2" strokeDasharray="4,2" />
          <line x1="160" y1="185" x2="160" y2="110" stroke="#1a3c34" strokeWidth="2" strokeDasharray="4,2" />
        </svg>
      </div>
    </div>
  )
}
