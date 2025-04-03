import { Clock, FileText, LockKeyhole, UserCheck } from "lucide-react"

export default function RecentActivity() {
  const activities = [
    {
      id: 1,
      transaction: "TX123456",
      property: "123 Blockchain Ave",
      action: "KYC verification completed",
      timestamp: "2 hours ago",
      icon: <UserCheck className="h-4 w-4" />,
      iconColor: "bg-green-100 text-green-700",
    },
    {
      id: 2,
      transaction: "TX789012",
      property: "456 Smart Contract St",
      action: "Document uploaded: Property Inspection",
      timestamp: "5 hours ago",
      icon: <FileText className="h-4 w-4" />,
      iconColor: "bg-blue-100 text-blue-700",
    },
    {
      id: 3,
      transaction: "TX123456",
      property: "123 Blockchain Ave",
      action: "Smart contract deployed",
      timestamp: "1 day ago",
      icon: <LockKeyhole className="h-4 w-4" />,
      iconColor: "bg-purple-100 text-purple-700",
    },
    {
      id: 4,
      transaction: "TX789012",
      property: "456 Smart Contract St",
      action: "Transaction created",
      timestamp: "2 days ago",
      icon: <Clock className="h-4 w-4" />,
      iconColor: "bg-yellow-100 text-yellow-700",
    },
  ]

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-3">
          <div className={`rounded-full p-1.5 ${activity.iconColor} flex-shrink-0 mt-0.5`}>{activity.icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{activity.action}</p>
            <p className="text-xs text-muted-foreground truncate">
              {activity.property} • {activity.transaction}
            </p>
          </div>
          <div className="text-xs text-muted-foreground whitespace-nowrap">{activity.timestamp}</div>
        </div>
      ))}
    </div>
  )
}

