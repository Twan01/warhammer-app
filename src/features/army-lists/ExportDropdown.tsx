/**
 * Phase 94 — Export DropdownMenu (EXP-01..04, D-01).
 *
 * Presentational component: 4-item dropdown for export actions.
 * All async logic lives in the parent (ArmyListDetailSheet).
 */
import { Download, Clipboard, Printer, FileJson, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportDropdownProps {
  onCopyToClipboard: () => void;
  onPrint: () => void;
  onSaveJson: () => void;
  onSavePdf: () => void;
  disabled?: boolean;
}

export function ExportDropdown({
  onCopyToClipboard,
  onPrint,
  onSaveJson,
  onSavePdf,
  disabled,
}: ExportDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={onCopyToClipboard}>
          <Clipboard className="mr-2 h-4 w-4" />
          Copy to Clipboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onPrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSaveJson}>
          <FileJson className="mr-2 h-4 w-4" />
          Save as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSavePdf}>
          <FileText className="mr-2 h-4 w-4" />
          Save as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
