// A performer hears a position before recording. In tests this also starts the audio device first:
// the instrument deliberately drops a touch when audio takes more than 250 ms to start
// (FrameAudioStartupExpired, "Audio is ready. Move again"), and on a busy test machine a cold
// start can exceed that, which would drop the first recorded note.
import { expect, type Page } from '@playwright/test';

export async function warmInstrument(page: Page): Promise<void> {
  const hear = page.getByRole('button', { name: 'Hear this position', exact: true });
  await hear.click();
  await expect.poll(() => page.evaluate(() =>
    Number(document.querySelector('.jb-deck')?.getAttribute('data-note-serial') ?? 0) > 0
    || document.body.innerText.includes('Audio is ready. Move again')), { timeout: 10_000, intervals: [25, 50] }).toBe(true);
  await expect(hear).toBeVisible(); // the note has ended and the deck is idle again
}
