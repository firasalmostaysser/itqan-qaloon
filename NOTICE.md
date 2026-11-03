# Notices

## Quran text and font — King Fahd Glorious Qur'an Printing Complex (KFGQPC)

`third_party/kfgqpc/qaloon/` contains the KFGQPC Uthmanic Qaloon font (version 10) and its Quran text data, obtained from https://github.com/thetruetruth/quran-data-kfgqpc. The glyph outlines in `site/data/glyphs.json` are drawn from that font without modification.

KFGQPC states that its fonts are available for copying, distribution and use free of charge in personal, commercial and all individual fields, on condition that the font is not attributed to anyone other than its owner, that no one reprograms or modifies its structures or components, and that it is not sold. The Complex keeps all rights to the font and to reproducing its letters. Source: https://fonts.qurancomplex.gov.sa

This project credits the Complex on every page, does not modify the font file, and is free of charge. Written confirmation is being requested from info@qurancomplex.gov.sa.

## Colour method and lesson texts

The six-colour method and the lesson texts are the work of Sheikh Muhammad bin Abdullah Jawwad (الشيخ المقرئ محمّد بن عبد الله جوّاد), from his course «الطريق إلى الإتقان – المستوى الأول», shared by the sheikh for this project.

## Code

All code in `src/`, `build/`, `test/` and `site/sw.js` is under the MIT licence (see LICENSE).

## Libraries

The build uses [harfbuzzjs](https://github.com/harfbuzz/harfbuzzjs) (MIT) to shape the text. It is not shipped to students.
