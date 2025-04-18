export default function DocumentsStep() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
      <div>
        <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 mb-6">
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
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" x2="8" y1="13" y2="13" />
            <line x1="16" x2="8" y1="17" y2="17" />
            <line x1="10" x2="8" y1="9" y2="9" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-teal-900 mb-4 font-display">Manage Documents</h2>
        <p className="text-neutral-600 mb-4">
          Securely store and share all your real estate transaction documents. All files are encrypted and stored on
          IPFS for maximum security and decentralization.
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
            <span>End-to-end encryption for all documents</span>
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
            <span>Decentralized storage on IPFS</span>
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
            <span>Easy document sharing with transaction parties</span>
          </li>
        </ul>
      </div>
      <div className="relative rounded-lg overflow-hidden shadow-lg border border-neutral-200 p-4 bg-white">
        {/* Custom SVG illustration */}
        <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
          {/* Document Management Illustration */}

          {/* Central IPFS Node */}
          <g transform="translate(200, 150)">
            <circle cx="0" cy="0" r="40" fill="#f0fdfa" stroke="#1a3c34" strokeWidth="3" />
            <text x="0" y="5" fontSize="16" fill="#1a3c34" textAnchor="middle">
              IPFS
            </text>
          </g>

          {/* Documents */}
          <g>
            {/* Document 1 */}
            <g transform="translate(80, 80)">
              <rect x="-20" y="-25" width="40" height="50" fill="#ffffff" stroke="#1a3c34" strokeWidth="2" />
              <line x1="-10" y1="-15" x2="10" y2="-15" stroke="#1a3c34" strokeWidth="2" />
              <line x1="-10" y1="-5" x2="10" y2="-5" stroke="#1a3c34" strokeWidth="2" />
              <line x1="-10" y1="5" x2="10" y2="5" stroke="#1a3c34" strokeWidth="2" />
              <line x1="-10" y1="15" x2="0" y2="15" stroke="#1a3c34" strokeWidth="2" />
            </g>

            {/* Document 2 */}
            <g transform="translate(80, 220)">
              <rect x="-20" y="-25" width="40" height="50" fill="#ffffff" stroke="#1a3c34" strokeWidth="2" />
              <line x1="-10" y1="-15" x2="10" y2="-15" stroke="#1a3c34" strokeWidth="2" />
              <line x1="-10" y1="-5" x2="10" y2="-5" stroke="#1a3c34" strokeWidth="2" />
              <line x1="-10" y1="5" x2="10" y2="5" stroke="#1a3c34" strokeWidth="2" />
              <line x1="-10" y1="15" x2="0" y2="15" stroke="#1a3c34" strokeWidth="2" />
            </g>

            {/* Document 3 */}
            <g transform="translate(320, 80)">
              <rect x="-20" y="-25" width="40" height="50" fill="#ffffff" stroke="#1a3c34" strokeWidth="2" />
              <line x1="-10" y1="-15" x2="10" y2="-15" stroke="#1a3c34" strokeWidth="2" />
              <line x1="-10" y1="-5" x2="10" y2="-5" stroke="#1a3c34" strokeWidth="2" />
              <line x1="-10" y1="5" x2="10" y2="5" stroke="#1a3c34" strokeWidth="2" />
              <line x1="-10" y1="15" x2="0" y2="15" stroke="#1a3c34" strokeWidth="2" />
            </g>

            {/* Document 4 */}
            <g transform="translate(320, 220)">
              <rect x="-20" y="-25" width="40" height="50" fill="#ffffff" stroke="#1a3c34" strokeWidth="2" />
              <line x1="-10" y1="-15" x2="10" y2="-15" stroke="#1a3c34" strokeWidth="2" />
              <line x1="-10" y1="-5" x2="10" y2="-5" stroke="#1a3c34" strokeWidth="2" />
              <line x1="-10" y1="5" x2="10" y2="5" stroke="#1a3c34" strokeWidth="2" />
              <line x1="-10" y1="15" x2="0" y2="15" stroke="#1a3c34" strokeWidth="2" />
            </g>
          </g>

          {/* Connection lines with encryption symbols */}
          <g>
            {/* Connection 1 */}
            <path d="M100,80 C130,100 150,120 160,150" stroke="#1a3c34" strokeWidth="2" strokeDasharray="5,3" />
            <circle cx="130" cy="115" r="10" fill="#d4af37" />
            <text x="130" y="119" fontSize="12" fill="#ffffff" textAnchor="middle">
              🔒
            </text>

            {/* Connection 2 */}
            <path d="M100,220 C130,200 150,180 160,150" stroke="#1a3c34" strokeWidth="2" strokeDasharray="5,3" />
            <circle cx="130" cy="185" r="10" fill="#d4af37" />
            <text x="130" y="189" fontSize="12" fill="#ffffff" textAnchor="middle">
              🔒
            </text>

            {/* Connection 3 */}
            <path d="M300,80 C270,100 250,120 240,150" stroke="#1a3c34" strokeWidth="2" strokeDasharray="5,3" />
            <circle cx="270" cy="115" r="10" fill="#d4af37" />
            <text x="270" y="119" fontSize="12" fill="#ffffff" textAnchor="middle">
              🔒
            </text>

            {/* Connection 4 */}
            <path d="M300,220 C270,200 250,180 240,150" stroke="#1a3c34" strokeWidth="2" strokeDasharray="5,3" />
            <circle cx="270" cy="185" r="10" fill="#d4af37" />
            <text x="270" y="189" fontSize="12" fill="#ffffff" textAnchor="middle">
              🔒
            </text>
          </g>

          {/* Users */}
          <g>
            <circle cx="30" cy="80" r="20" fill="#1a3c34" />
            <text x="30" y="85" fontSize="10" fill="#ffffff" textAnchor="middle">
              User 1
            </text>

            <circle cx="30" cy="220" r="20" fill="#1a3c34" />
            <text x="30" y="225" fontSize="10" fill="#ffffff" textAnchor="middle">
              User 2
            </text>

            <circle cx="370" cy="80" r="20" fill="#d4af37" />
            <text x="370" y="85" fontSize="10" fill="#ffffff" textAnchor="middle">
              User 3
            </text>

            <circle cx="370" cy="220" r="20" fill="#d4af37" />
            <text x="370" y="225" fontSize="10" fill="#ffffff" textAnchor="middle">
              User 4
            </text>
          </g>

          {/* User to Document connections */}
          <g>
            <line x1="50" y1="80" x2="60" y2="80" stroke="#1a3c34" strokeWidth="2" />
            <line x1="50" y1="220" x2="60" y2="220" stroke="#1a3c34" strokeWidth="2" />
            <line x1="350" y1="80" x2="340" y2="80" stroke="#d4af37" strokeWidth="2" />
            <line x1="350" y1="220" x2="340" y2="220" stroke="#d4af37" strokeWidth="2" />
          </g>
        </svg>
      </div>
    </div>
  )
}
