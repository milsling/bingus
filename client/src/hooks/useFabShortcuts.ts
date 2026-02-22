import { useState } from "react";

const STORAGE_KEY_LEFT = "fab-shortcut-left";
const STORAGE_KEY_RIGHT = "fab-shortcut-right";

export type ShortcutTarget =
  | "messages"
  | "ai-assistant"
  | "profile"
  | "friends"
  | "saved"
  | "prompts"
  | "challenges"
  | "orphanage"
  | "orphanstudio";

export const SHORTCUT_OPTIONS: {
  value: ShortcutTarget;
  label: string;
  description: string;
}[] = [
  { value: "messages", label: "Messages", description: "Open DMs" },
  { value: "ai-assistant", label: "Orphie Voice", description: "AI assistant" },
  { value: "profile", label: "My Bars", description: "Your profile" },
  { value: "friends", label: "Friends", description: "Your circle" },
  { value: "saved", label: "Saved", description: "Bookmarked bars" },
  { value: "prompts", label: "Prompts", description: "Writing prompts" },
  { value: "challenges", label: "Challenges", description: "Battles & events" },
  { value: "orphanage", label: "The Orphanage", description: "Adopt open bars" },
  { value: "orphanstudio", label: "Orphan Studio", description: "Write & rhyme" },
];

export function useFabShortcuts() {
  const [leftTarget, setLeftTarget] = useState<ShortcutTarget>(() => {
    if (typeof window === "undefined") return "messages";
    return (localStorage.getItem(STORAGE_KEY_LEFT) as ShortcutTarget) || "messages";
  });

  const [rightTarget, setRightTarget] = useState<ShortcutTarget>(() => {
    if (typeof window === "undefined") return "ai-assistant";
    return (localStorage.getItem(STORAGE_KEY_RIGHT) as ShortcutTarget) || "ai-assistant";
  });

  const setLeft = (target: ShortcutTarget) => {
    setLeftTarget(target);
    localStorage.setItem(STORAGE_KEY_LEFT, target);
  };

  const setRight = (target: ShortcutTarget) => {
    setRightTarget(target);
    localStorage.setItem(STORAGE_KEY_RIGHT, target);
  };

  return { leftTarget, rightTarget, setLeft, setRight };
}
