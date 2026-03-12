"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global Error Boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
      <div className="p-4 rounded-full bg-destructive/10 text-destructive mb-6">
        <AlertTriangle className="w-12 h-12" />
      </div>
      <h2 className="text-3xl font-bold tracking-tight mb-2">Something went wrong!</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        We encountered an unexpected error. Our team has been notified. 
        Please try refreshing the page or attempting the action again.
      </p>
      <div className="flex gap-4">
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline"
          className="min-w-[120px]"
        >
          Reload Page
        </Button>
        <Button 
          onClick={() => reset()} 
          className="min-w-[120px]"
        >
          Try Again
        </Button>
      </div>
      {process.env.NODE_ENV === "development" && (
        <div className="mt-12 p-4 bg-muted rounded-xl text-left font-mono text-xs max-w-2xl overflow-auto border border-border">
          <p className="font-bold text-destructive mb-2">{error.name}: {error.message}</p>
          <pre>{error.stack}</pre>
        </div>
      )}
    </div>
  );
}
