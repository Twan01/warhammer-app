import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { useDatabaseBrowserFilters } from "./databaseBrowserFilters";

export function DatabaseBrowserFilters({ roles = [] }: { roles?: string[] }) {
  const {
    roleFilter,
    keywordFilter,
    pointMin,
    pointMax,
    setRoleFilter,
    setKeywordFilter,
    setPointMin,
    setPointMax,
    clearFilters,
  } = useDatabaseBrowserFilters();

  const hasActiveFilters =
    roleFilter !== null ||
    keywordFilter.length > 0 ||
    pointMin !== null ||
    pointMax !== null;

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <Select
        value={roleFilter ?? ""}
        onValueChange={(val) => setRoleFilter(val === "__clear__" ? null : val || null)}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__clear__">All roles</SelectItem>
          {roles.map((role) => (
            <SelectItem key={role} value={role}>
              {role}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        className="w-40"
        placeholder="Keyword..."
        value={keywordFilter}
        onChange={(e) => setKeywordFilter(e.target.value)}
      />

      <Input
        className="w-24"
        type="number"
        placeholder="Min pts"
        value={pointMin ?? ""}
        onChange={(e) =>
          setPointMin(e.target.value ? Number(e.target.value) : null)
        }
      />

      <Input
        className="w-24"
        type="number"
        placeholder="Max pts"
        value={pointMax ?? ""}
        onChange={(e) =>
          setPointMax(e.target.value ? Number(e.target.value) : null)
        }
      />

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-1 h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
