import { Skeleton } from "@/components/ui/skeleton";
import { useUdbSearch } from "@/hooks/useUnitDatabase";

interface UdbSearchResultsProps {
  query: string;
  onSelectResult: (unitId: string) => void;
}

export function UdbSearchResults({ query, onSelectResult }: UdbSearchResultsProps) {
  const { data: results = [], isLoading } = useUdbSearch(query);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="px-4 py-6">
        <h3 className="text-sm font-medium">No units found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          No units match &ldquo;{query}&rdquo;. Try a different search term.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <p className="text-xs text-muted-foreground px-4 py-2">
        {results.length} result{results.length !== 1 ? "s" : ""}
      </p>
      {results.map((result) => (
        <div
          key={result.unit_id}
          className="flex flex-col gap-0.5 px-4 py-2 hover:bg-secondary cursor-pointer transition-colors"
          onClick={() => onSelectResult(result.unit_id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelectResult(result.unit_id);
            }
          }}
        >
          <span className="text-xs text-muted-foreground">
            {result.faction_name}
          </span>
          <span className="text-sm font-medium">{result.name}</span>
          {result.keywords && (
            <span className="text-xs text-muted-foreground truncate">
              {result.keywords}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
