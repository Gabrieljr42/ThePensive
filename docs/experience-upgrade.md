# The Midnight Archive: experience upgrade

## Diagnosis

The first slice put an atmospheric picture behind a conventional navbar, hero, boxed form, measurement strip, and two result cards. It established the identity and interaction contract, but the picture receded once the reader reached the results. The corpus selector and evidence drawer also behaved like ordinary application controls.

The upgrade treats the archive as a persistent place and the controls as its working objects. It preserves the FastAPI contracts, run controller, source provenance, citations, metrics, and module boundaries.

## Implemented experience

- **Threshold at `/`:** a short architectural reveal, a distinct Pensieve identity, a direct desk shortcut, and a camera-like approach when entering. Direct `/ask` navigation remains available.
- **Persistent room:** original architecture, a transparent foreground desk, separate moonlight/ember/mist layers, quiet particles, and capped pointer/scroll parallax. Lighting follows RAG, Full Context, Compare, search, evidence, and error states.
- **Desk composition:** selectable book objects on the left, a textured question manuscript at the center, and an experiment instrument on the right. The instrument shows real run configuration and declared mock state; it does not invent measurements.
- **Corpus objects:** each book is generated from the actual corpus catalog. Selection changes the API corpus and illuminates that volume. Mobile/tablet retain a matching native selector. The current two available collections are shown; seven novels are not fabricated.
- **Question thread:** a light travels from the actual question coordinates to the selected book or visible native selector. It is an interaction cue for submission, not an unrelated animation.
- **Retrieval ritual:** source leaves use the run's source IDs. Held RAG leaves, released leaves, and the complete Full Context scope are distinct. The mock trace is labeled as a demonstration.
- **Twin Tomes:** perspective reveals, page stacks, warm/cool illumination, material variation, literary reading typography, and restrained claim-level ink reveals. All original modes, metrics, and partial/cancelled/error behavior remain available.
- **Source chamber:** a citation dims the room and reveals a source leaf centrally. The cited claim, source metadata, exact highlighted text, structural match, and separate support state share one composition. Native dialog focus, keyboard scrolling, Escape, and focus restoration are preserved.
- **Evidence constellation:** an optional deterministic question → claim → source map. Every edge comes from a stored citation. Claim focus reveals its sources; source focus reveals dependent claims. Mobile presents the same relationships as a readable list.

## Design system

The original indigo, parchment, brass, and moonlight palette gains Deep Archive, Night Shelf, Old Ink, Ember, and Mist roles. Lighting is layered rather than represented by flat color alone.

Cormorant Garamond supplies the identity and display titles. Source Serif 4 supplies comfortable manuscript reading. Source Sans 3 supplies exact controls, metadata, and measurements. All font files are locally bundled.

Paper fibers, book cloth, engraved geometry, page edges, and wood establish material depth. Decorative symbols are original and restrained. The aisle is a tier-scaled WebGL scene (stacks, desk, candle, and moonbeam) with procedural noise; the research desk stays in the DOM.

## Accessibility and performance

Reduced motion removes travel and physical reveals while preserving readable states and connection information. Quiet reading pauses ambient movement. Hidden-document animation loops pause, pointer updates are batched in requestAnimationFrame, and touch does not drive parallax. No sound is played or loaded automatically; future audio must be opt-in.

The foreground and paper were encoded as WebP (about 269 KB and 109 KB). Responsive Next.js image delivery handles the architecture and desk. Constellation graphics use a small deterministic SVG and semantic buttons. The actual API interface remains usable if imagery or spatial effects fail.

## Creative references

- [The Pendragon Cycle, Format-3](https://format-3.co/work/pendragon-cycle): its documented layered atmosphere, cinematic prologue, tactile art direction, and performance discipline informed the threshold and persistent room.
- [ASTRA website designer interview](https://astra.hybeim.com/en/news/dev-note/1324): its discussion of detailed art balanced with simple information shapes informed the relationship map. The constellation layout is our interpretation for Pensieve's real citation data.
- [Hogwarts Legacy official site](https://www.hogwartslegacy.com/en-us): a reference for large magical spaces and warm/cool atmosphere, without reproducing its logos, architecture, or assets.
- Shadow and Bone — Beyond the Fold: the original live experience was inaccessible during this review. The user's described principle of object-based navigation informed the corpus volumes; no claim is made that the current live site was inspected.

## Verification

The acceptance suite now covers the threshold, desktop book selection, source relationships, source-chamber matching and focus, all answering modes, cancellation, unsupported questions, request errors, tablet/mobile reflow, mobile tabs/stacking, and reduced motion. Automated accessibility scans run on the threshold, source chamber, tablet, and narrow-mobile views.

These are automated checks and visual inspections, not a claim of exhaustive accessibility certification or measured AI quality. Answers, retrieval, timings, token counts, and API cost remain explicitly mocked in this milestone.

Final native production checks pass: 13 backend tests, 13 browser tests, TypeScript, ESLint, and the Webpack production build. The additional browser case checks LCP below 2.5 seconds, CLS at or below 0.1, and reported interaction duration at or below 200ms under local desktop Chrome conditions. It is one laboratory sample and does not establish field percentiles; event durations below the reporting threshold may be absent.

Docker Compose syntax passed validation. Its build encountered Docker engine internal errors and was cancelled without restarting the user's unrelated database services. Container execution remains unverified; the standalone native production server runs the delivered experience.
