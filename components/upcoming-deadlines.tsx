import { CalendarClock } from "lucide-react"

export default function UpcomingDeadlines() {
  const deadlines = [
    {
      id: 1,
      transaction: "TX123456",
      property: "123 Blockchain Ave",
      event: "Property Inspection",
      date: "Apr 25, 2023",
      daysLeft: 3,
    },
    {
      id: 2,
      transaction: "TX789012",
      property: "456 Smart Contract St",
      event: "Document Submission",
      date: "Apr 28, 2023",
      daysLeft: 6,
    },
    {
      id: 3,
      transaction: "TX123456",
      property: "123 Blockchain Ave",
      event: "Title Transfer",
      date: "May 5, 2023",
      daysLeft: 13,
    },
  ]

  return (
    <div className="space-y-4">
      {deadlines.map((deadline) => (
        <div key={deadline.id} className="flex items-start gap-3">
          <div className="rounded-full bg-orange-100 p-1.5 text-orange-700 flex-shrink-0 mt-0.5">
            <CalendarClock className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">{deadline.event}</p>
            <p className="text-xs text-muted-foreground">
              {deadline.property} • {deadline.date}
            </p>
          </div>
          <div className="ml-auto text-xs font-medium text-orange-600 whitespace-nowrap">
            {deadline.daysLeft} days left
          </div>
        </div>
      ))}
    </div>
  )
}

