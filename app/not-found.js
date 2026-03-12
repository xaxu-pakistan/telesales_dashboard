import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Home } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-6">
      <div className="space-y-4 text-center">
        <h2 className="text-4xl font-extrabold tracking-tight lg:text-5xl">404</h2>
        <p className="text-xl text-muted-foreground max-w-[600px] mx-auto">
          We couldn't find the page you were looking for. It might have been moved or deleted.
        </p>
        <div className="pt-6">
          <Button asChild className="rounded-xl px-8 py-6 text-lg font-medium">
            <Link href="/">
              <Home className="mr-2 h-5 w-5" />
              Return to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
