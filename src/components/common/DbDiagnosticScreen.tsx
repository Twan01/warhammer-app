import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Database, RefreshCw } from "lucide-react";

interface DbDiagnosticScreenProps {
  error: string | null;
  onRetry: () => void;
}

export function DbDiagnosticScreen({ error, onRetry }: DbDiagnosticScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-destructive" />
            <CardTitle>Database Connection Error</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error ?? "An unknown database error occurred."}
            </AlertDescription>
          </Alert>
          <p className="text-sm text-muted-foreground">
            Try restarting the application. If the problem persists, your
            database file may be corrupted.
          </p>
          <Button onClick={onRetry} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Connection
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
