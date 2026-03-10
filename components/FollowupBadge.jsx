import { Badge } from "@/components/ui/badge";

export function FollowupBadge({ status }) {
  if (!status) return <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">No Orders</Badge>;
  
  switch(status) {
    case "overdue":
      return <Badge variant="destructive" className="bg-red-600">Overdue</Badge>;
    case "due-today":
      return <Badge className="bg-amber-600 hover:bg-amber-700 text-white">Due Today</Badge>;
    case "upcoming":
      return <Badge className="bg-blue-600 hover:bg-blue-700 text-white">Upcoming</Badge>;
    case "done":
      return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">Done</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
