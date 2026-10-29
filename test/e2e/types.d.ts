type Problem = { id: string; check: string; wcag: string | null; selector: string | null; html: string | null; component: string | null; fix: string; verify: string };
type Line = { time: string; result: string; check: string; wcag: string | null; text: string; fixed: boolean; selector: string | null; stop: number | null };

declare global {
  interface Window {
    __tabTrail: {
      version: string;
      play(options?: { ignore?: string[]; delay?: number }): Promise<string>;
      problems(): Problem[];
      report(): string;
      log(): Line[];
      state(): { walked: number; total: number; done: boolean };
      close(): void;
    };
  }
}

export {};
