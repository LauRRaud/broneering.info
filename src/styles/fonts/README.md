# Bundled booking fonts

- Cormorant Garamond: https://github.com/google/fonts/tree/main/ofl/cormorantgaramond
- Manrope: https://github.com/google/fonts/tree/main/ofl/manrope

Source: official google/fonts variable TTF files retrieved 2026-09-12. Converted with fontTools to WOFF2 and subset to Latin, Latin Extended, Cyrillic and interface punctuation. Upstream names and variable weight axes are retained. CormorantGaramond-OFL.txt and Manrope-OFL.txt contain the SIL Open Font License and copyright notices.

Next.js next/font/local serves these files from this application. Visitors do not request fonts from Google. Preload is disabled because each tenant can choose different body and heading fonts. Font families use CSS variables, not global component selectors.
