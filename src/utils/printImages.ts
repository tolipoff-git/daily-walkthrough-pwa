/**
 * Wait until every image in the print views has actually decoded.
 *
 * The print views are `hidden print:block`: on screen they are `display:none`,
 * so their base64 JPEGs are never decoded until the print media query flips them
 * visible — which happens *during* `window.print()`. The browser snapshots the
 * page synchronously and does not wait for images, so the photos came out blank
 * on paper. Decoding them up front (with a hard timeout so printing can never
 * hang) is what makes the evidence sheets show up.
 */

/** Roots of the two print-only views (daily report + weekly executive report). */
const PRINT_ROOTS = '.print-report-container, .print-weekly-container';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== 'function') {
      resolve();
      return;
    }
    requestAnimationFrame(() => resolve());
  });
}

/** Resolve when the print root exists (React may still be committing the render). */
async function waitForPrintRoot(timeoutMs = 2000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (document.querySelector(PRINT_ROOTS)) return true;
    await nextFrame();
  }
  return false;
}

function waitForImage(img: HTMLImageElement): Promise<void> {
  // Already decoded — `decode()` is a cheap no-op that also covers the case where
  // `complete` is true but the bitmap has been evicted.
  if (img.complete && img.naturalWidth > 0) {
    return typeof img.decode === 'function' ? img.decode().catch(() => undefined) : Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      img.removeEventListener('load', done);
      img.removeEventListener('error', done);
      // A decoded bitmap is what the printer needs; a failure just resolves.
      if (typeof img.decode === 'function') img.decode().catch(() => undefined).then(() => resolve());
      else resolve();
    };
    img.addEventListener('load', done);
    img.addEventListener('error', done);
    // Cached / broken images can miss the events entirely.
    if (img.complete) done();
  });
}

/**
 * Await every `<img>` inside the print views, then let layout settle.
 * Never rejects and never blocks longer than `timeoutMs`.
 */
export async function waitForPrintImages(timeoutMs = 6000): Promise<void> {
  await waitForPrintRoot();

  const imgs = Array.from(document.querySelectorAll<HTMLImageElement>(`${PRINT_ROOTS} img`));
  if (imgs.length === 0) {
    await nextFrame();
    return;
  }

  await Promise.race([Promise.all(imgs.map(waitForImage)), delay(timeoutMs)]);

  // Two frames so the decoded bitmaps are laid out before the snapshot.
  await nextFrame();
  await nextFrame();
}
