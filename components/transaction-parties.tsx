import { User } from "lucide-react"

interface TransactionPartiesProps {
  buyer: string
  seller: string
}

export default function TransactionParties({ buyer, seller }: TransactionPartiesProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center mr-3">
          <User className="h-5 w-5 text-teal-700" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Buyer</p>
          <p className="font-medium">{buyer}</p>
        </div>
      </div>

      <div className="flex items-center">
        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center mr-3">
          <User className="h-5 w-5 text-teal-700" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Seller</p>
          <p className="font-medium">{seller}</p>
        </div>
      </div>

      <div className="flex items-center">
        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center mr-3">
          <User className="h-5 w-5 text-teal-700" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Escrow Agent</p>
          <p className="font-medium">CryptoEscrow</p>
        </div>
      </div>
    </div>
  )
}

