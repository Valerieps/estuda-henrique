/** Sharing text: the system share sheet when there is one, else the clipboard. */
export type ShareResult = 'shared' | 'copied' | 'failed';

export interface SharePort {
  share(text: string): Promise<ShareResult>;
}

interface ShareEnv {
  share?: (data: { text: string }) => Promise<void>;
  clipboard?: { writeText(text: string): Promise<void> };
}

export async function shareText(text: string, env: ShareEnv = browserEnv()): Promise<ShareResult> {
  if (env.share) {
    try {
      await env.share({ text });
      return 'shared';
    } catch (error) {
      // Closing the share sheet is not an error.
      if (error instanceof DOMException && error.name === 'AbortError') return 'failed';
    }
  }
  if (env.clipboard) {
    try {
      await env.clipboard.writeText(text);
      return 'copied';
    } catch {
      return 'failed';
    }
  }
  return 'failed';
}

export const share: SharePort = { share: (text) => shareText(text) };

function browserEnv(): ShareEnv {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  return {
    share: nav?.share ? (data) => nav.share(data) : undefined,
    clipboard: nav?.clipboard,
  };
}
