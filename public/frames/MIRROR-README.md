# Image Compression Comparison

Visual comparison of compression options for earth.gov images. View live at the GitHub Pages URL.

## What this tests

32 images in `public/images/` are over 1MB (total ~77MB). This repo tests compression to find optimal settings before re-uploading to S3/CloudFront.

## Compression tools & commands

### Static images (JPG/PNG → WebP)

Uses [`cwebp`](https://developers.google.com/speed/webp/docs/cwebp) from the libwebp package:

```bash
cwebp -q <quality> -metadata icc -mt -exact -m 6 input.{jpg,png} -o output.webp
```

**Flags:**
- `-q N` — Quality level (0–100). Tested at 60, 70, 80
- `-metadata icc` — Preserve ICC color profile
- `-mt` — Multi-threaded encoding
- `-exact` — Preserve RGB values in transparent areas
- `-m 6` — Best compression method (slowest encode, smallest output)

**Results:** 74–85% size reduction across all static images.

### Animated GIFs → WebM (VP9)

Uses `ffmpeg` with VP9 codec:

```bash
ffmpeg -i input.gif -c:v libvpx-vp9 -crf 30 -b:v 0 -an output.webm
```

**Flags:**
- `-c:v libvpx-vp9` — VP9 video codec
- `-crf 30` — Constant rate factor (quality level, lower = better quality)
- `-b:v 0` — Let CRF fully control quality (no bitrate cap)
- `-an` — No audio track

**Results:** ~85% size reduction (34.4 MB → 5.2 MB total).

### What didn't work: Animated GIF → Animated WebP

We also tested `gif2webp` (animated WebP), but it made every file **~2x larger** than the original GIF. This happens because GIF's 256-color palette + LZW compression is actually efficient for dithered video-like frames, while animated WebP's VP8 encoder treats the dithering artifacts as complex detail. WebM's VP9 codec wins because it has true inter-frame motion compensation.

## Reproducing

### Prerequisites

```bash
brew install webp ffmpeg    # macOS
apt install webp ffmpeg     # Debian/Ubuntu
```

### Run compression

```bash
./compress.sh
```

Converts all files in `originals/`:
- JPG/PNG → WebP at q60, q70, q80 (into `webp-q60/`, `webp-q70/`, `webp-q80/`)
- GIF → WebM VP9 CRF 30 (into `webm/`)

### View comparison

Open `index.html` in a browser (or visit the GitHub Pages URL). Features:
- Static images: side-by-side original vs q60/q70/q80 WebP
- Animated GIFs: side-by-side original GIF vs WebM video
- File sizes and savings percentages
- Filter by format, sort by name/size/savings

## File naming convention

Original paths are flattened with `--` as separator:

```
public/images/themes/energy/card.png → themes--energy--card.png
```

## Findings

### Static images

| Format | Count | Original Total | WebP q60 | Savings |
|--------|-------|---------------|----------|---------|
| JPG    | 15    | 32.7 MB       | 4.5 MB   | ~86%    |
| PNG    | 12    | 14.7 MB       | 3.6 MB   | ~76%    |

### Animated GIFs

| Format | Count | Original Total | WebM VP9 | Savings |
|--------|-------|---------------|----------|---------|
| GIF    | 5     | 34.4 MB       | 5.2 MB   | ~85%    |

Note: Animated WebP was tested but made files 2x larger — not viable for this content.

**Recommendation:** WebP q60 for static images, WebM VP9 for animated GIFs. Requires `<video autoplay muted loop playsinline>` tag instead of `<img>` for the GIF replacements.
