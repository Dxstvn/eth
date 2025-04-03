import { CheckCircle, Clock } from "lucide-react"

interface TimelineEvent {
  date: string
  event: string
  status: string
}

interface TransactionTimelineProps {
  timeline: TimelineEvent[]
}

export default function TransactionTimeline({ timeline }: TransactionTimelineProps) {
  return (
    <div className="space-y-4">
      {timeline.map((event, index) => (
        <div key={index} className="flex">
          <div className="mr-4 flex flex-col items-center">
            <div
              className={`rounded-full w-8 h-8 flex items-center justify-center ${
                event.status === "completed"
                  ? "bg-green-100"
                  : event.status === "in_progress"
                    ? "bg-blue-100"
                    : "bg-gray-100"
              }`}
            >
              {event.status === "completed" ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            {index < timeline.length - 1 && (
              <div className={`w-0.5 h-full ${event.status === "completed" ? "bg-green-200" : "bg-gray-200"}`}></div>
            )}
          </div>
          <div className="pb-6">
            <p className="font-medium">{event.event}</p>
            <p className="text-sm text-muted-foreground">{new Date(event.date).toLocaleDateString()}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

