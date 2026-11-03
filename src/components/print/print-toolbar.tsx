"use client";

import { useEffect, useState } from "react";

const SHEET_PX = (210 / 25.4) * 96; // A4 width in CSS pixels

/** Fits the A4 sheets to the screen and prints once the logo and fonts have loaded. */
export function PrintToolbar({ backHref, pages }: { backHref: string; pages: number }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const fit = () => {
      const zoom = Math.min(1, (window.innerWidth - 24) / SHEET_PX);
      document.documentElement.style.setProperty("--qb-zoom", String(zoom));
    };
    fit();
    window.addEventListener("resize", fit);

    const images = Array.from(document.querySelectorAll<HTMLImageElement>(".qb-print img"));
    const imagesLoaded = Promise.all(
      images.map((img) => (img.complete ? Promise.resolve() : new Promise<void>((r) => { img.onload = () => r(); img.onerror = () => r(); }))),
    );
    Promise.all([document.fonts.ready, imagesLoaded]).then(() => setReady(true));
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <div className="qb-toolbar">
      <a className="qb-secondary" href={backHref}>Back</a>
      <button className="qb-primary" type="button" disabled={!ready} onClick={() => window.print()}>
        {ready ? "Print" : "Loading…"}
      </button>
      <span className="qb-pages">{pages} page{pages === 1 ? "" : "s"} · A4 · save as PDF from the print dialog</span>
    </div>
  );
}
