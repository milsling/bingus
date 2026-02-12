import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, LibraryBig, NotebookPen } from "lucide-react";
import Editor from "./Editor";
import SidebarRhyme from "./SidebarRhyme";
import FullRhymes from "./FullRhymes";
import SettingsModal, { StudioSettings } from "./SettingsModal";
import { EMPTY_RHYMES, RhymeData, RhymeResults, getRhymes } from "./rhymeUtils";

const STORAGE_KEY = "orphanstudio-data";
const RHYME_DATA_URL = new URL("./rhymes.json", import.meta.url).href;

const DEFAULT_SETTINGS: StudioSettings = {
  autosave: true,
  focusMode: false,
  fontSize: "md",
};

type StudioSnapshot = {
  title: string;
  lyrics: string;
  settings: StudioSettings;
  lastSavedAt: string | null;
};

function parseSnapshot(raw: string | null): StudioSnapshot | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StudioSnapshot>;
    if (typeof parsed !== "object" || parsed === null) return null;

    return {
      title: typeof parsed.title === "string" ? parsed.title : "Untitled studio session",
      lyrics: typeof parsed.lyrics === "string" ? parsed.lyrics : "",
      settings: {
        autosave:
          typeof parsed.settings?.autosave === "boolean"
            ? parsed.settings.autosave
            : DEFAULT_SETTINGS.autosave,
        focusMode:
          typeof parsed.settings?.focusMode === "boolean"
            ? parsed.settings.focusMode
            : DEFAULT_SETTINGS.focusMode,
        fontSize:
          parsed.settings?.fontSize === "sm" ||
          parsed.settings?.fontSize === "md" ||
          parsed.settings?.fontSize === "lg"
            ? parsed.settings.fontSize
            : DEFAULT_SETTINGS.fontSize,
      },
      lastSavedAt:
        typeof parsed.lastSavedAt === "string" || parsed.lastSavedAt === null
          ? parsed.lastSavedAt
          : null,
    };
  } catch {
    return null;
  }
}

export default function OrphanStudioPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const hasInitializedChanges = useRef(false);

  const [title, setTitle] = useState("Untitled studio session");
  const [lyrics, setLyrics] = useState("");
  const [currentWord, setCurrentWord] = useState("");
  const [rhymes, setRhymes] = useState<RhymeResults>(EMPTY_RHYMES);
  const [rhymeData, setRhymeData] = useState<RhymeData | null>(null);
  const [isRhymeDataLoading, setIsRhymeDataLoading] = useState(true);

  const [settings, setSettings] = useState<StudioSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fullRhymesOpen, setFullRhymesOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const saveSnapshot = useCallback(
    (withToast = false) => {
      const nextSavedAt = new Date().toISOString();
      const snapshot: StudioSnapshot = {
        title,
        lyrics,
        settings,
        lastSavedAt: nextSavedAt,
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
        setLastSavedAt(nextSavedAt);
        setPendingSave(false);
        if (withToast) {
          toast({
            title: "Saved to your browser",
            description: "OrphanStudio session updated in local storage.",
          });
        }
      } catch {
        toast({
          title: "Save failed",
          description: "Could not save locally in this browser session.",
          variant: "destructive",
        });
      }
    },
    [title, lyrics, settings, toast],
  );

  useEffect(() => {
    const saved = parseSnapshot(localStorage.getItem(STORAGE_KEY));
    if (saved) {
      setTitle(saved.title);
      setLyrics(saved.lyrics);
      setSettings(saved.settings);
      setLastSavedAt(saved.lastSavedAt);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadRhymes() {
      try {
        const response = await fetch(RHYME_DATA_URL);
        if (!response.ok) {
          throw new Error("Failed to load local rhyme data");
        }
        const data = (await response.json()) as RhymeData;
        if (isMounted) {
          setRhymeData(data);
        }
      } catch {
        if (isMounted) {
          setRhymeData({
            dictionary: {},
            endings: [],
            wordBank: [],
          });
        }
      } finally {
        if (isMounted) {
          setIsRhymeDataLoading(false);
        }
      }
    }

    void loadRhymes();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!currentWord) {
      setRhymes(EMPTY_RHYMES);
      return;
    }
    setRhymes(getRhymes(currentWord, rhymeData));
  }, [currentWord, rhymeData]);

  useEffect(() => {
    if (!hydrated) return;
    if (!hasInitializedChanges.current) {
      hasInitializedChanges.current = true;
      return;
    }
    setPendingSave(true);
  }, [title, lyrics, settings.fontSize, settings.focusMode, settings.autosave, hydrated]);

  useEffect(() => {
    if (!hydrated || !settings.autosave || !pendingSave) return;
    const timeout = window.setTimeout(() => saveSnapshot(false), 450);
    return () => window.clearTimeout(timeout);
  }, [hydrated, settings.autosave, pendingSave, saveSnapshot]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isSaveCombo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s";
      if (!isSaveCombo) return;
      event.preventDefault();
      saveSnapshot(true);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveSnapshot]);

  const handleWordChange = (word: string) => {
    setCurrentWord(word);
  };

  const handleUseRhyme = (word: string) => {
    setCurrentWord(word);
    void navigator.clipboard?.writeText(word);
    toast({
      title: "Copied",
      description: `"${word}" copied to clipboard.`,
    });
  };

  const autosaveLabel = useMemo(() => {
    if (!settings.autosave) return "Autosave off";
    return pendingSave ? "Autosave pending" : "Autosave on";
  }, [settings.autosave, pendingSave]);

  return (
    <div className="min-h-screen bg-background pt-14 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] md:pt-24 md:pb-6">
      <div className="container mx-auto max-w-7xl p-4">
        <div className="glass-surface mb-4 rounded-3xl border border-border/55 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.18em] text-primary/85">Writing workspace</p>
              <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
                <NotebookPen className="h-6 w-6 text-primary" />
                OrphanStudio
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Draft lyrics, collect fragments, and search rhyme options without leaving the site.
                Everything stores locally in your browser under <code>orphanstudio-data</code>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate("/apps")}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to Apps
              </Button>
              <Button variant="secondary" onClick={() => setFullRhymesOpen(true)}>
                <LibraryBig className="mr-1 h-4 w-4" />
                Full dictionary
              </Button>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{autosaveLabel}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Editor
            title={title}
            lyrics={lyrics}
            currentWord={currentWord}
            settings={settings}
            pendingSave={pendingSave}
            lastSavedAt={lastSavedAt}
            onTitleChange={setTitle}
            onLyricsChange={setLyrics}
            onWordChange={handleWordChange}
            onSave={() => saveSnapshot(true)}
            onOpenSettings={() => setSettingsOpen(true)}
          />

          <SidebarRhyme
            currentWord={currentWord}
            rhymes={rhymes}
            isLoadingData={isRhymeDataLoading}
            onUseRhyme={handleUseRhyme}
            onOpenFullRhymes={() => setFullRhymesOpen(true)}
          />
        </div>
      </div>

      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onChange={(next) => setSettings((previous) => ({ ...previous, ...next }))}
      />
      <FullRhymes
        open={fullRhymesOpen}
        onOpenChange={setFullRhymesOpen}
        currentWord={currentWord}
        rhymes={rhymes}
        rhymeData={rhymeData}
        onUseRhyme={handleUseRhyme}
      />
    </div>
  );
}
