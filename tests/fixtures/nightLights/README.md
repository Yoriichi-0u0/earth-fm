# Night Lights fixtures

`svs5313.decoded.bmp` is `public/nasa/svs5313/svs5313_eic_02599_print.jpg` (SHA-256 `6e3e92ea…81bc`) decoded once on macOS with `sips -s format bmp` (24-bit, 1024 × 288). `decade/YYYY.bmp.gz` are `public/nasa/svs5313/decade/YYYY.jpg` (NASA's annual frames, see `provenance.json` there) decoded the same way and gzipped. Node has no built-in JPEG decoder, so unit tests read these lossless decodes; browsers decode the JPEGs themselves and the Playwright tests run the same analysis on the browser's pixels.

Ported with the analysis modules from the team's hackathon repository `Yoriichi-0u0/TerraJuke-SpaceApps-2026` at commit `4a1abc4` (14 Nov 2026).
