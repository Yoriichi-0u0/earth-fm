# TerraJuke 4: The Air We Share (14 November 2026)

**Goal.** Make TerraJuke the most memorable Earth Information Jukebox: a crowd can walk up, press Play and hear NASA's view of the planet. A judge sees exactly where the sound comes from, and everyone learns how NASA's satellites, models and visualizers turn Earth into pictures, and how TerraJuke turns those pictures into sound for anyone, anywhere.

**Judged against** the official Details text (retrieved 14 Nov): EIC frames + real-time sonification, select a visualization with its soundscape, mappings such as colour → chords and pixel density → rhythm, musicality over raw noise, accessibility as a core theme (screen readers, tactile feedback, rich description), and telling the story with emotional impact.

## 1. New record: The Air We Share (NASA SVS 5669, GEOS Aerosols, 19 Aug 2025 20:00 UTC)

A listed challenge resource that NASA itself describes as suited to *multi-track experimentation*. NASA colours four aerosol types: black carbon (smoke), dust, sea salt and sulfate. TerraJuke makes each one an instrument.

- **Earth is the record.** A Three.js globe wearing NASA's still turns under a fixed needle. Each slice of longitude passing the needle is one step of the groove: 64 steps, 5.625° each.
- **Four-track mixer.** Black carbon is a low brass-like voice, dust a warm string pad, sea salt a soft ocean bed and sulfate a glassy bell. Each track has Mute and Solo and a live level meter.
- **Fixed, explainable mapping.** Each pixel is placed on NASA's own colour bar by hue (read from NASA's colour-bar image). How strongly it reaches toward that swatch's colour sets the amount. Per step and track:
  - amount sets loudness, and a track rests where there is no aerosol, so rhythm comes from the map (the challenge's "pixel density into rhythm");
  - the latitude of that type sets pitch within the voice's register, on one shared pentatonic scale, so the tracks always harmonise;
  - longitude sets stereo pan.
- **Side B: NASA's stories.** The six events NASA describes are each a short track: Hurricane Erin, the Saharan dust journey, Kilauea's sulfate plume, Etna's plume, southern African fire smoke and Spain's wildfires. Unit tests pin that each story's box is dominated by the aerosol NASA names.
- **Accessibility.** The whole map works by keyboard, one step at a time, with spoken descriptions such as "30°W: strong dust near 15°N, faint sulfate". Captions, an aria-live announcer, Android vibration patterns per type, a reduced-motion still globe and a 2D map fallback.

## 2. The Record Journey (every record)

An animated liner-note strip (Anime.js) that answers "where did this come from, and where does it go?":

> Sensor or model → NASA team → NASA Scientific Visualization Studio → Earth Information Center → TerraJuke in your browser → **you**, in your own time zone.

It names the real satellites, instruments and people, and ends with the listener's local time and region (from the browser's time zone, never from location data). It is an ordered list underneath, so screen readers get the same story.

## 3. Jukebox polish (Anime.js)

The new record joins the shelf as record 03. Motion is reserved for meaning (the record dropping on, the mixer meters, the journey path) and is always off under reduced motion.

## 4. Simpler chrome (requested 14 Nov)

Simplified Chinese is removed: the interface is English only, the dictionary and language selector are gone, and old language preferences are ignored. Appearance is a one-press segmented control (Auto · Light · Dark) instead of a dropdown.

## 5. Ship

Unit and e2e tests for every new behaviour, docs (`docs/AIR.md`, SUBMISSION, README), merge, deploy and verify live.

## Not claimed

GEOS is a model analysis that assimilates satellite and ground observations. It is not a direct measurement, and the colour bar carries no numeric scale, so TerraJuke reports rendered colour strength, never optical depth or concentrations. The still is one moment (19 Aug 2025, 20:00 UTC). Shares are of map pixels on an equirectangular map, not of area.
