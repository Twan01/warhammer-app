import { useState } from "react";
import { Trash2, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useJournalSessions,
  useCreatePaintingSession,
  useDeletePaintingSession,
} from "@/hooks/useJournalSessions";
import {
  useUnitPhotos,
  useCreateUnitPhoto,
  useDeleteUnitPhoto,
  type UnitPhotoWithUrl,
} from "@/hooks/useUnitPhotos";

interface JournalTabProps {
  unitId: number;
  onPhotoClick: (photo: UnitPhotoWithUrl) => void;
}

const SECTION_LABEL_CLASS =
  "text-xs font-semibold text-muted-foreground uppercase tracking-wide";

const TEXTAREA_CLASS =
  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const STAGE_PRESETS = [
  "Primed",
  "Base coat",
  "Washed",
  "Layer",
  "Highlighted",
  "Finished",
] as const;
const OTHER_STAGE = "Other";

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function JournalTab({ unitId, onPhotoClick }: JournalTabProps) {
  // ───────────── Sessions ─────────────
  const sessionsQuery = useJournalSessions(unitId);
  const createSession = useCreatePaintingSession();
  const deleteSession = useDeletePaintingSession(unitId);

  const [sessionDate, setSessionDate] = useState<string>(todayISO());
  const [duration, setDuration] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  async function handleLogSession() {
    const minutes = Number(duration);
    if (!sessionDate || !Number.isFinite(minutes) || minutes <= 0) return;
    try {
      await createSession.mutateAsync({
        unit_id: unitId,
        session_date: sessionDate,
        duration_minutes: Math.floor(minutes),
        notes: notes.trim() || null,
      });
      // Reset form to defaults
      setSessionDate(todayISO());
      setDuration("");
      setNotes("");
    } catch {
      toast.error("Failed to log session — try again.");
    }
  }

  // ───────────── Photos ─────────────
  const photosQuery = useUnitPhotos(unitId);
  const createPhoto = useCreateUnitPhoto();
  const deletePhoto = useDeleteUnitPhoto(unitId);

  const [pendingFilePath, setPendingFilePath] = useState<string | null>(null);
  const [pendingFileExt, setPendingFileExt] = useState<string | null>(null);
  const [stageSelect, setStageSelect] = useState<string>("");
  const [otherStageText, setOtherStageText] = useState<string>("");
  const [captionDraft, setCaptionDraft] = useState<string>("");

  async function handleAttachPhoto() {
    // 13-RESEARCH.md §Pitfall 6: when multiple:false, result is `string | null`.
    const result = (await openDialog({
      multiple: false,
      directory: false,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
    })) as string | null;
    if (result === null) return;
    setPendingFilePath(result);
    const ext = result.split(".").pop()?.toLowerCase() ?? "jpg";
    setPendingFileExt(ext);
  }

  function effectiveStageLabel(): string | null {
    if (!stageSelect) return null;
    if (stageSelect === OTHER_STAGE) {
      const trimmed = otherStageText.trim();
      return trimmed === "" ? null : trimmed;
    }
    return stageSelect;
  }

  function canSavePhoto(): boolean {
    if (!pendingFilePath) return false;
    if (!stageSelect) return false;
    if (stageSelect === OTHER_STAGE && otherStageText.trim() === "") return false;
    return true;
  }

  async function handleSavePhoto() {
    if (!pendingFilePath || !pendingFileExt) return;
    try {
      // 13-RESEARCH.md §Pitfall 1: readFile with absolute path → NO baseDir option.
      const data = await readFile(pendingFilePath);
      const filename = `${crypto.randomUUID()}.${pendingFileExt}`;
      await writeFile(filename, data, { baseDir: BaseDirectory.AppData });
      await createPhoto.mutateAsync({
        unit_id: unitId,
        file_path: filename,
        caption: captionDraft.trim() || null,
        stage_label: effectiveStageLabel(),
        taken_at: todayISO(),
      });
      // Reset attach form
      setPendingFilePath(null);
      setPendingFileExt(null);
      setStageSelect("");
      setOtherStageText("");
      setCaptionDraft("");
    } catch {
      toast.error("Failed to save photo — try again.");
    }
  }

  const sessions = sessionsQuery.data ?? [];
  const photos = photosQuery.data ?? [];
  const sessionsLoading = sessionsQuery.isLoading;
  const photosLoading = photosQuery.isLoading;

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 p-4">
        {/* ─────────────── Sessions ─────────────── */}
        <section>
          <h3 className="text-base font-semibold mb-3">Sessions</h3>

          {/* Inline log form */}
          <div className="flex flex-col gap-4 bg-card rounded-md p-3 mb-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="journal-session-date" className={SECTION_LABEL_CLASS}>Date</Label>
              <Input
                id="journal-session-date"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="journal-session-duration" className={SECTION_LABEL_CLASS}>Duration</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="journal-session-duration"
                  type="number"
                  min={1}
                  placeholder="e.g. 45"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">min</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="journal-session-notes" className={SECTION_LABEL_CLASS}>Notes</Label>
              <textarea
                id="journal-session-notes"
                className={TEXTAREA_CLASS}
                rows={3}
                placeholder="Optional notes about this session…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <Button
              variant="default"
              disabled={!sessionDate || duration === "" || createSession.isPending}
              onClick={handleLogSession}
            >
              Log Session
            </Button>
          </div>

          {/* Sessions list */}
          {sessionsLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-12 w-full rounded-md" />
              <Skeleton className="h-12 w-full rounded-md" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center">No sessions logged yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-card rounded-md p-3 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{session.session_date}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{session.duration_minutes} min</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        aria-label={`Delete session from ${session.session_date}`}
                        onClick={() => deleteSession.mutate(session.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                  {session.notes && (
                    <p className="text-sm whitespace-pre-wrap">{session.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <Separator />

        {/* ─────────────── Photos ─────────────── */}
        <section>
          <h3 className="text-base font-semibold mb-3">Photos</h3>

          {/* Attach form */}
          <div className="flex flex-col gap-3 bg-card rounded-md p-3 mb-4">
            <Button variant="outline" onClick={handleAttachPhoto}>
              <ImageIcon className="mr-2 h-4 w-4" aria-hidden="true" />
              {pendingFilePath ? "Change Photo" : "Attach Photo"}
            </Button>

            {pendingFilePath && (
              <p className="text-xs text-muted-foreground truncate" title={pendingFilePath}>
                Selected: {pendingFilePath.split(/[\\/]/).pop()}
              </p>
            )}

            <div className="flex flex-col gap-1">
              <Label htmlFor="journal-photo-stage" className={SECTION_LABEL_CLASS}>Stage</Label>
              <Select value={stageSelect} onValueChange={setStageSelect}>
                <SelectTrigger id="journal-photo-stage">
                  <SelectValue placeholder="Select a stage" />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_PRESETS.map((preset) => (
                    <SelectItem key={preset} value={preset}>{preset}</SelectItem>
                  ))}
                  <SelectItem value={OTHER_STAGE}>{OTHER_STAGE}</SelectItem>
                </SelectContent>
              </Select>

              {stageSelect === OTHER_STAGE && (
                <Input
                  type="text"
                  placeholder="Describe this stage…"
                  value={otherStageText}
                  onChange={(e) => setOtherStageText(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="journal-photo-caption" className={SECTION_LABEL_CLASS}>Caption</Label>
              <Input
                id="journal-photo-caption"
                type="text"
                placeholder="Optional caption…"
                value={captionDraft}
                onChange={(e) => setCaptionDraft(e.target.value)}
              />
            </div>

            <Button
              variant="default"
              disabled={!canSavePhoto() || createPhoto.isPending}
              onClick={handleSavePhoto}
            >
              Save Photo
            </Button>
          </div>

          {/* Thumbnail grid */}
          {photosLoading ? (
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="w-full h-24 rounded-sm" />
              <Skeleton className="w-full h-24 rounded-sm" />
              <Skeleton className="w-full h-24 rounded-sm" />
            </div>
          ) : photos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center">No photos added yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => {
                const cell = (
                  <div
                    key={photo.id}
                    className="relative group rounded-sm overflow-hidden bg-card cursor-pointer"
                    role="button"
                    tabIndex={0}
                    aria-label={`Open ${photo.stage_label ?? "photo"} full size`}
                    onClick={() => onPhotoClick(photo)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onPhotoClick(photo);
                      }
                    }}
                  >
                    <img
                      src={photo.assetUrl}
                      alt={photo.stage_label ?? "Unit photo"}
                      className="object-cover w-full h-24 rounded-sm"
                    />
                    {/* Hover overlay + delete button */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 text-white bg-black/50 hover:bg-destructive opacity-0 group-hover:opacity-100"
                      aria-label={`Delete photo${photo.stage_label ? ` (${photo.stage_label})` : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePhoto.mutate(photo.id);
                      }}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                    {photo.stage_label && (
                      <p className="text-xs text-muted-foreground text-center truncate mt-1">
                        {photo.stage_label}
                      </p>
                    )}
                  </div>
                );
                return photo.caption ? (
                  <Tooltip key={photo.id}>
                    <TooltipTrigger asChild>{cell}</TooltipTrigger>
                    <TooltipContent>{photo.caption}</TooltipContent>
                  </Tooltip>
                ) : (
                  cell
                );
              })}
            </div>
          )}
        </section>
      </div>
    </TooltipProvider>
  );
}
