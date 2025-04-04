import { TrendingUp, TrendingDown } from "lucide-react"

export default function MarketOverview() {
  const cryptoData = [
    {
      name: "Bitcoin (BTC)",
      price: "$42,850.23",
      change: "+2.4%",
      trend: "up",
    },
    {
      name: "Ethereum (ETH)",
      price: "$3,125.67",
      change: "+1.8%",
      trend: "up",
    },
    {
      name: "USD Coin (USDC)",
      price: "$1.00",
      change: "0.0%",
      trend: "neutral",
    },
    {
      name: "Solana (SOL)",
      price: "$102.45",
      change: "-1.2%",
      trend: "down",
    },
  ]

  return (
    <div className="space-y-4">
      {cryptoData.map((crypto, index) => (
        <div key={index} className="flex items-center justify-between">
          <div>
            <p className="font-medium">{crypto.name}</p>
            <p className="text-sm text-gray-500">{crypto.price}</p>
          </div>
          <div
            className={`flex items-center ${
              crypto.trend === "up" ? "text-green-600" : crypto.trend === "down" ? "text-red-600" : "text-gray-500"
            }`}
          >
            {crypto.trend === "up" ? (
              <TrendingUp className="h-4 w-4 mr-1" />
            ) : crypto.trend === "down" ? (
              <TrendingDown className="h-4 w-4 mr-1" />
            ) : null}
            <span>{crypto.change}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

