import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUdbSearch } from "@/hooks/useUnitDatabase";
import { useCollectionFilters } from "@/features/units/collectionFilters";

interface UdbSearchResultsProps {
  query: string;
  onSelectResult: (unitId: string) => void;
  /** Phase 138-03 D-07: faction-agnostic ownership Map for search results */
  ownershipAllMap?: Map<string, { owned_count: number; all_statuses: string }>;
}

export function UdbSearchResults({ query, onSelectResult, ownershipAllMap }: UdbSearchResultsProps) {
  const { data: results = [], isLoading } = useUdbSearch(query);
  // Phase 138-03 D-06: deep-link into the Collection filtered to the selected unit
  const setUdbUnitIdFilter = useCollectionFilters((s) => s.setUdbUnitIdFilter);

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
      {results.map((result) => {
        const ownership = ownershipAllMap?.get(result.unit_id);
        const isOwned = ownership != null && ownership.owned_count > 0;

        return (
          <div
            key={result.unit_id}
            className="flex items-start gap-2 px-4 py-2 hover:bg-secondary cursor-pointer transition-colors"
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
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
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
            {isOwned && (
              <Link
                to="/collection"
                onClick={(e) => {
                  e.stopPropagation();
                  setUdbUnitIdFilter(result.unit_id);
                }}
                aria-label={`View ${ownership.owned_count} owned ${result.name} in Collection`}
              >
                <Badge variant="outline" className="text-xs shrink-0 hover:bg-secondary cursor-pointer">
                  Owned x{ownership.owned_count}
                </Badge>
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
