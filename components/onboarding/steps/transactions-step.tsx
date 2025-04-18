export default function TransactionsStep() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
      <div className="order-2 md:order-1 relative rounded-lg overflow-hidden shadow-lg border border-neutral-200 p-4 bg-white">
        {/* Custom SVG illustration */}
        <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
          {/* Transaction Flow Diagram */}

          {/* Buyer */}
          <g transform="translate(50, 50)">
            <circle cx="0" cy="0" r="30" fill="#1a3c34" />
            <text x="0" y="5" fontSize="12" fill="#ffffff" textAnchor="middle">
              Buyer
            </text>
          </g>

          {/* Smart Contract */}
          <g transform="translate(200, 150)">
            <rect
              x="-50"
              y="-40"
              width="100"
              height="80"
              rx="5"
              ry="5"
              fill="#f0fdfa"
              stroke="#1a3c34"
              strokeWidth="3"
            />
            <text x="0" y="-15" fontSize="12" fill="#1a3c34" textAnchor="middle">
              Smart
            </text>
            <text x="0" y="5" fontSize="12" fill="#1a3c34" textAnchor="middle">
              Contract
            </text>
            <text x="0" y="25" fontSize="12" fill="#1a3c34" textAnchor="middle">
              Escrow
            </text>
          </g>

          {/* Seller */}
          <g transform="translate(350, 50)">
            <circle cx="0" cy="0" r="30" fill="#d4af37" />
            <text x="0" y="5" fontSize="12" fill="#ffffff" textAnchor="middle">
              Seller
            </text>
          </g>

          {/* Flow arrows */}
          <g>
            {/* Buyer to Smart Contract - Funds */}
            <path d="M80,50 C120,50 120,110 150,110" stroke="#1a3c34" strokeWidth="3" fill="none" />
            <polygon points="150,110 140,105 140,115" fill="#1a3c34" />
            <text x="100" y="40" fontSize="12" fill="#1a3c34" textAnchor="middle">
              Funds
            </text>

            {/* Smart Contract to Seller - Funds (dashed until conditions met) */}
            <path
              d="M250,110 C280,110 280,50 320,50"
              stroke="#d4af37"
              strokeWidth="3"
              fill="none"
              strokeDasharray="5,3"
            />
            <polygon points="320,50 310,45 310,55" fill="#d4af37" />
            <text x="300" y="40" fontSize="12" fill="#d4af37" textAnchor="middle">
              Funds
            </text>
            <text x="300" y="55" fontSize="10" fill="#d4af37" textAnchor="middle">
              (when conditions met)
            </text>

            {/* Seller to Smart Contract - Documents/Conditions */}
            <path d="M320,70 C280,70 280,130 250,130" stroke="#d4af37" strokeWidth="3" fill="none" />
            <polygon points="250,130 260,125 260,135" fill="#d4af37" />
            <text x="300" y="90" fontSize="12" fill="#d4af37" textAnchor="middle">
              Documents
            </text>

            {/* Smart Contract to Buyer - Verification */}
            <path d="M150,130 C120,130 120,70 80,70" stroke="#1a3c34" strokeWidth="3" fill="none" />
            <polygon points="80,70 90,65 90,75" fill="#1a3c34" />
            <text x="100" y="90" fontSize="12" fill="#1a3c34" textAnchor="middle">
              Verification
            </text>
          </g>

          {/* Conditions checklist */}
          <g transform="translate(200, 240)">
            <rect
              x="-80"
              y="-20"
              width="160"
              height="60"
              rx="5"
              ry="5"
              fill="#ffffff"
              stroke="#1a3c34"
              strokeWidth="2"
            />
            <text x="0" y="0" fontSize="12" fill="#1a3c34" textAnchor="middle">
              Conditions for Release:
            </text>
            <text x="-70" y="20" fontSize="10" fill="#1a3c34" textAnchor="start">
              ✓ Title Transfer
            </text>
            <text x="0" y="20" fontSize="10" fill="#1a3c34" textAnchor="start">
              ✓ Inspection
            </text>
            <text x="-70" y="35" fontSize="10" fill="#1a3c34" textAnchor="start">
              ✓ Documents Signed
            </text>
          </g>
        </svg>
      </div>
      <div className="order-1 md:order-2">
        <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 mb-6">
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
            <path d="M21 5H3" />
            <path d="M9 5V3" />
            <path d="M15 5V3" />
            <path d="M21 8H3" />
            <path d="M12 12v6" />
            <path d="M9 15h6" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-teal-900 mb-4 font-display">Create Transactions</h2>
        <p className="text-neutral-600 mb-4">
          Set up secure escrow transactions for your real estate deals. Our smart contracts ensure funds are only
          released when all conditions are met.
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
            <span>Smart contract-based escrow for maximum security</span>
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
            <span>Customizable conditions for fund release</span>
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
            <span>Real-time transaction status tracking</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
