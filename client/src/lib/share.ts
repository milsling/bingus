export interface ShareData {
  title: string;
  text: string;
  url: string;
}

export async function shareContent(data: ShareData): Promise<{ success: boolean; method: "native" | "clipboard" }> {
  // Try native Web Share API first (works on mobile and some desktop browsers)
  if (navigator.share) {
    try {
      await navigator.share(data);
      return { success: true, method: "native" };
    } catch (error: any) {
      // User cancelled or share failed, fall through to clipboard
      if (error.name === "AbortError") {
        return { success: false, method: "native" };
      }
    }
  }

  // Fallback to clipboard
  try {
    await navigator.clipboard.writeText(data.url);
    return { success: true, method: "clipboard" };
  } catch (error) {
    return { success: false, method: "clipboard" };
  }
}

export function getBarShareData(bar: { id: string; content: string; user: { username: string } }): ShareData {
  const truncatedContent = bar.content.length > 100 
    ? bar.content.substring(0, 100) + "..." 
    : bar.content;
  
  return {
    title: `Bar by @${bar.user.username} - Orphan Bars`,
    text: truncatedContent,
    url: `${window.location.origin}/bars/${bar.id}`,
  };
}

export function getProfileShareData(username: string): ShareData {
  return {
    title: `@${username} on Orphan Bars`,
    text: `Check out @${username}'s bars on Orphan Bars`,
    url: `${window.location.origin}/u/${username}`,
  };
}
