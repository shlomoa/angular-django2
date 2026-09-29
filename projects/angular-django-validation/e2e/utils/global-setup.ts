/**
 * Vitest global setup for the E2E suite. It owns temp-area cleanup, so the run
 * leaves the repository as it found it:
 *
 * - before any worker starts, it removes areas an earlier run left behind (for
 *   example after being killed, when no `finally` block could run);
 * - the returned teardown removes whatever this run left, whether the tests
 *   passed or failed;
 * - Ctrl-C (`SIGINT`), `SIGTERM`, and `SIGHUP` remove it before the process
 *   exits, because Vitest can exit on a signal without running the teardown.
 *
 * Only `SIGKILL`, which no process can observe, leaves a workspace behind; the
 * next run's start-up sweep removes it.
 *
 * The sweep must not live in a spec file: the spec files run in parallel
 * workers, and one worker would delete another worker's live workspace.
 *
 * Debug mode (`ANGULAR_DJANGO2_E2E_DEBUG`) keeps every temp area.
 */
import { getRepoRoot, isE2EDebugMode, sweepE2ETempAreas } from './temp_areas';

/** The interrupt signals that end a run early, with their conventional exit codes. */
const INTERRUPT_EXIT_CODES = { SIGHUP: 129, SIGINT: 130, SIGTERM: 143 } as const;

type InterruptSignal = keyof typeof INTERRUPT_EXIT_CODES;

/** Where interrupt signals are observed; the current process by default. */
export interface SignalSource {
  on(signal: InterruptSignal, listener: () => void): unknown;
  off(signal: InterruptSignal, listener: () => void): unknown;
}

export interface E2EGlobalSetupOptions {
  repoRoot?: string;
  env?: Record<string, string | undefined>;
  log?: (message: string) => void;
  signals?: SignalSource;
  exit?: (code: number) => void;
}

/** Build the Vitest global setup; the options exist so tests can use a scratch root. */
export function createE2EGlobalSetup(options: E2EGlobalSetupOptions = {}): () => () => void {
  const repoRoot = options.repoRoot ?? getRepoRoot();
  const env = options.env ?? process.env;
  const log = options.log ?? console.log;
  const signals: SignalSource = options.signals ?? process;
  const exit = options.exit ?? ((code: number) => process.exit(code));

  return () => {
    if (isE2EDebugMode(env)) {
      log('[E2E] Debug mode enabled; temp areas are kept for investigation.');
      return () => undefined;
    }

    const sweep = (when: string): void => {
      const removed = sweepE2ETempAreas(repoRoot, env);

      if (removed.length > 0) {
        log(`[E2E] Removed ${removed.length} temp area(s) ${when}.`);
      }
    };

    sweep('left by an earlier run');

    const handlers = (Object.keys(INTERRUPT_EXIT_CODES) as InterruptSignal[]).map((signal) => {
      const handler = (): void => {
        sweep('after an interrupt');
        exit(INTERRUPT_EXIT_CODES[signal]);
      };
      signals.on(signal, handler);

      return { signal, handler };
    });

    return () => {
      for (const { signal, handler } of handlers) {
        signals.off(signal, handler);
      }
      sweep('at the end of the run');
    };
  };
}

export default createE2EGlobalSetup();
