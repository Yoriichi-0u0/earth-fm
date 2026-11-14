# Source verification: all seven records (14 November 2026)

Checked by Jacy's Claude at Jacy's request on production 7.0.0 (`8ec8e34`). Question for each record: is the sound
made from an original NASA source, are the bundled files the bytes NASA published, and is it a remix?

## Method

1. **Local integrity.** Every `sha256` in `public/**/*provenance*.json` was recomputed from the bundled file.
   Result: **all 36 bundled hashed files match** (34 found by script, including the 12 Night Lights decade
   frames, plus the vinyl art and the Blue Marble display image checked by hand). Two recorded originals are not
   bundled and could not be checked locally: the SVS 5313 source movie and the 5400 px Blue Marble original.
2. **Upstream identity.** Each pinned NASA file's original URL was fetched again and its SHA-256 compared.
   svs.gsfc.nasa.gov refused connections from this network and from the web fetcher on 14 Nov, so the Internet
   Archive raw capture (`web.archive.org/web/2026id_/<original URL>`) was used, as the handoff allows.

## Results

| # | Record | Source | Bytes vs NASA | Original NASA source? | Verdict |
|---|---|---|---|---|---|
| 01 | Climate Spiral | SVS 5190 still + GISTEMP v4 CSV from data.giss.nasa.gov | SVS still: archive copy is a *different revision* (100,497 vs 100,355 bytes); NASA re-renders this spiral monthly, so the 18 Oct pin can no longer be re-fetched. GISTEMP CSV: hash matches the pin; upstream updates monthly | Yes | **Keep.** Pinned 2026-10-18 from NASA directly |
| 02 | Night Lights | SVS 5313 EIC Version still + 12 frames from NASA's movie | Still: identical to NASA original and archive at retrieval (recorded in provenance); frames match their pins | Yes, EIC | **Keep** |
| 03 | The Air We Share | SVS 5669 GEOS aerosols frame + NASA colour bar | **Match** (both files) | Yes, listed Resource | **Keep** |
| 04 | Currents of Heat | SVS 3912 ECCO2 frame + NASA colour bar | **Match** (both files) | Yes, listed Resource | **Keep** |
| 05 | Moving Earth | earth.gov EIC exhibit animation via a third-party GitHub mirror (`CarsonDavis/compression-comparison`) | Cannot be checked: the earth.gov originals return 404 and the mirror's provenance says the official bytes "could not be independently checked" | NASA/EIC content, but **not from a NASA server** | **Flag.** Honestly labelled on the shelf as an archived mirror; replace if an SVS original is found |
| 06 | Arctic September | NSIDC daily extent CSV (NSIDC-0051/0081) via a third-party GitHub notebook repo (`s4f-dortmund/open_data_notebooks`), averaged into Septembers by this project | Matches its pin; no NASA visual exists for it | NASA-funded NSIDC data, **project-derived, not a NASA visual** | **Replaced on 15 Nov 2026** by record 06 *The Ice Year* (NASA SVS 5046; 12 EXR frames pinned with SHA-256, see [ARCTIC-ICE.md](ARCTIC-ICE.md)). The NSIDC series remains only in the Arctic guided story under Explore Data and Create |
| 07 | Temperature Through Time | GISTEMP v4 (same file as Record 01 Side B) | Matches its pin | NASA data, but a **remix of Record 01 Side B** | **Replace** (handoff task 1, after 06) |

## Also noted

- The vinyl artwork (`public/art/terrajuke-vinyl-surface.jpg`) and the icon are AI-generated (credited in their
  provenance files). The Space Apps rules require a **visible watermark** on AI-generated images; check before
  submitting.
- To re-run: the scripts used are described above; the hash check is a few lines of Python over the provenance
  files, and the upstream check needs network access to the Internet Archive.
