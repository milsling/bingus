import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Settings2, Save, Clock3 } from "lucide-react";
import { extractWordAtCursor } from "./rhymeUtils";
import { StudioSettings } from "./SettingsModal";

interface EditorProps {
  title: string;
  lyrics: string;
  currentWord: string;
  settings: StudioSettings;
  pendingSave: boolean;
  lastSavedAt: string | null;
  onTitleChange: (value: string) => void;
  onLyricsChange: (value: string) => void;
  onWordChange: (word: string) => void;
  onSave: () => void;
  onOpenSettings: () => void;
}

const FONT_SIZE_CLASS: Record<StudioSettings["fontSize"], string> = {
  sm: "text-sm leading-6",
  md: "text-base leading-7",
  lg: "text-lg leading-8",
};

export default function Editor({
  title,
  lyrics,
  currentWord,
  settings,
  pendingSave,
  lastSavedAt,
  onTitleChange,
  onLyricsChange,
  onWordChange,
  onSave,
  onOpenSettings,
}: EditorProps) {
  const stats = useMemo(() => {
    const trimmed = lyrics.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const lines = lyrics.length > 0 ? lyrics.split("\n").length : 0;
    return {
      words,
      lines,
      chars: lyrics.length,
    };
  }, [lyrics]);

  const updateCurrentWord = (value: string, cursor: number | null) => {
    const resolvedCursor = cursor ?? value.length;
    onWordChange(extractWordAtCursor(value, resolvedCursor));
  };

  return (
    <section
      className={`glass-surface flex h-full flex-col rounded-3xl border border-border/55 p-4 ${
        settings.focusMode ? "shadow-[0_0_0_1px_rgba(99,102,241,0.35)]" : ""
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-[14rem] flex-1">
          <Input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Untitled session"
            className="glass-field rounded-xl border-none bg-transparent text-lg font-semibold"
            data-testid="orphanstudio-input-title"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onOpenSettings}>
            <Settings2 className="mr-1 h-4 w-4" />
            Settings
          </Button>
          <Button variant="default" size="sm" onClick={onSave} data-testid="orphanstudio-save-button">
            <Save className="mr-1 h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="rounded-full">
          {stats.words} words
        </Badge>
        <Badge variant="secondary" className="rounded-full">
          {stats.lines} lines
        </Badge>
        <Badge variant="secondary" className="rounded-full">
          {stats.chars} chars
        </Badge>
        <Badge variant="outline" className="rounded-full capitalize">
          Current: {currentWord || "—"}
        </Badge>
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock3 className="h-3 w-3" />
          {pendingSave
            ? "Unsaved changes"
            : lastSavedAt
              ? `Saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "Ready"}
        </span>
      </div>

      <div className="relative flex-1">
        <Textarea
          value={lyrics}
          onChange={(event) => {
            onLyricsChange(event.target.value);
            updateCurrentWord(event.target.value, event.target.selectionStart);
          }}
          onClick={(event) => {
            const target = event.currentTarget;
            updateCurrentWord(target.value, target.selectionStart);
          }}
          onKeyUp={(event) => {
            const target = event.currentTarget;
            updateCurrentWord(target.value, target.selectionStart);
          }}
          placeholder="Write lyrics, fragments, hooks, notes, and brainstorm ideas..."
          data-testid="orphanstudio-editor"
          className={`h-full min-h-[48vh] resize-none rounded-2xl border-border/55 bg-background/35 p-4 font-mono ${FONT_SIZE_CLASS[settings.fontSize]}`}
        />
      </div>
    </section>
  );
}
