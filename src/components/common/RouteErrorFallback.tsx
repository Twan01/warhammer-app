import { type ErrorComponentProps, Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function RouteErrorFallback({ error, reset }: ErrorComponentProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle>Something went wrong</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {import.meta.env.DEV && (
            <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
              {error.message}
              {error.stack && "\n" + error.stack}
            </pre>
          )}
          <div className="flex gap-2">
            <Button onClick={reset}>Reload Page</Button>
            <Button variant="outline" asChild>
              <Link to="/">Go to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
