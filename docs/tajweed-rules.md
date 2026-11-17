# Tajweed colouring rules: the Sheikh's method, Qalun reading

The rules this project uses to colour the Quran text and grade the drills, as they
stand on 2026-11-17. They follow the method of the Sheikh, al-Muqri' Muhammad ibn
Abdallah Jawwad, in his course «الطريق إلى الإتقان», on the riwaya of Qalun ʿan
Nafiʿ, and the spelling of the Tunisian «المصحف المعلّم».

The document describes the rules, not a program. The examples come from al-Fatiha
and Juz' ʿAmma (the 38 surahs the drills cover), and the counts are for those surahs.
Points not yet confirmed with the Sheikh are marked **(to confirm)** and listed at the end.

---

## 1. What can be coloured

Each letter has up to four parts, each with its own colour:

| Part | What it is |
|---|---|
| **The letter** | its shape |
| **The haraka** | fatha, damma, kasra, or the first stroke of a tanween |
| **The sign** | a sukun or a shadda |
| **The second stroke** | of a tanween: it stands for the tanween's noon |

Pause marks (ۖ ۗ ۚ …), the ayah markers and the dots of the ة at a stop are never coloured.

## 2. The six colours

In the order of the Sheikh's legend:

| Colour | Name | Meaning | On which part |
|---|---|---|---|
| Red `#ED2024` | ساكن رخو | a sakin «soft» letter | the sukun or shadda |
| Cyan `#2FAAE1` | ساكن بيني | a sakin «intermediate» letter | the sukun or shadda |
| Green `#51B848` | ساكن شديد | a sakin «strong» letter | the sukun or shadda |
| Navy `#21458E` | إتمام الحركات | a haraka to complete | the haraka |
| Purple `#FF00FF` | تمكين الغنة | a complete ghunnah | the shadda of «نّ مّ», the letter, the second stroke or the small meem (§5) |
| Orange `#F8993E` | تخليص الحروف | a heavy letter | the letter |

A colour is never shown alone in the interface: it always comes with its name.

## 3. ساكن: the time of a letter (red, cyan, green)

**The letter groups:**

- **شديد (green):** «أجد قط بكت»: ء ج د ق ط ب ك ت.
- **بيني (cyan):** «لن عمر»: ل ن ع م ر.
- **رخو (red):** every other letter.

**Which letters:** a letter written with a **sukun** or a **shadda**. A shadda counts
as a sakin letter followed by the same letter.

**Where the colour goes:** on the sukun or shadda, and **the letter stays ink**
(«الرَّحْمَٰنِ»: an ink ح with a red sukun). A letter that is sakin but has no
sign written shows nothing, except the letter the reader stops on (§7).

**Not coloured:**

- a madd letter (ا، ى، and a bare و or ي);
- hamzat al-wasl;
- the silent lam of the article before a sun letter («اَ۬لشَّمْسِ»: the lam is not read; the شّ is).

**The drawn shadda of the doubled lam** («لِلَّهِ»، «اَ۬لَّذِينَ»، §8.1) is cyan, like a written one.

## 4. إتمام الحركات (navy)

Every written haraka is navy: fatha, damma, kasra, and the tanweens, including on
the last letter of an ayah.

- **A tanween written on an alif or ى** for the letter before it («خَيْراً»، «يُسْراً»):
  it is that letter's haraka, so its first stroke is navy on the alif.
- **The fatha of the doubled lam** («لِلَّهِ»، «اَ۬لَّذِينَ») is written in and is navy (§8.1).
- **A tanween's second stroke** is not a haraka: it takes the colour of its noon (§5.4),
  or navy when that noon has no colour.

## 5. تمكين الغنة (purple)

Only a **complete ghunnah** is purple. A moving noon or mim, or one read clearly
(إظهار), takes no purple.

### 5.1 The doubled noon and mim

«نّ» and «مّ»: **the shadda is purple, the letter stays ink** («إِنَّ»، «ثُمَّ»، «اَ۬لنَّاسِ»).

### 5.2 The sakin noon (and the tanween's noon)

By the letter read after it:

| After it | Rule | Ghunnah |
|---|---|---|
| ء هـ ع ح غ خ | الإظهار | none (read clearly) |
| ي ن م و | الإدغام بغنة | complete |
| ل ر | الإدغام بلا غنة | none |
| ب | القلب (إقلاب) | complete |
| any other letter | الإخفاء | complete |

- **A noon before و or ي inside one word** («الدُّنْيَا»، «صِنْوَانٌ») is إظهار.
- **A noon or tanween before hamzat al-wasl** is not a sakin noon: it takes a kasra to
  join, so it has a light ghunnah and no colour.
- **Pause marks inside the ayah are read on:** a noon or tanween before one keeps its rule.

### 5.3 The sakin mim

| After it | Rule | Ghunnah |
|---|---|---|
| ب | الإخفاء (الشفوي) | complete |
| م | الإدغام (المتماثلين) | complete |
| any other letter | الإظهار (الشفوي) | none |

### 5.4 Where the purple goes

- **A sakin noon or mim merged or hidden, written with no shadda** («مِن شَرِّ»، «مِن قَبْلِ»):
  the **letter** is purple.
- **A tanween merged or hidden** («يَوْمَئِذٍ تُحَدِّثُ»، «خَيْراً يَرَهُۥ»): the **second stroke**
  of the tanween is purple. The letter stays ink (or orange if heavy), and the first stroke stays navy.
  On «خَيْراً» the purple is on the alif's tanween. 143 places.
- **The small meem of إقلاب** (ۢ), on a noon («مِنۢ بَعْدِ») or for a tanween («لَنَسْفَعاَۢ بِالنَّاصِيَةِ»):
  the **small meem** is purple and the letter stays ink. 27 places.
- **A bare noon or mim merged into «نّ» or «مّ»** («رَبِّهِم مِّن»، «مِن نِّعْمَةٍ»): **no colour of its own**,
  because the next letter's shadda carries the ghunnah (§5.1), as on the Sheikh's page of al-Layl.
- **A tanween read clearly (إظهار)** («لِأَحَدٍ عِندَهُ»): its noon is a sakin noon, so its second stroke is
  **cyan (ساكن بيني)**, as on the Sheikh's own page of al-Layl.
- **A tanween before ل or ر** (إدغام بلا غنة): its noon becomes a sakin ل or ر, so its second stroke is **cyan**.
- **A tanween merged into «نّ» or «مّ»**: its second stroke is **purple**, and so is the next letter's shadda.
- **A tanween before hamzat al-wasl**: its noon is read with a kasra to join, so its second stroke is **navy**.
- No stroke of a tanween is ever left without a colour.

### 5.5 Precedence on one letter

On the letter's shape: تمكين الغنة first, then تخليص الحروف, then the time colour
(the time colour reaches the shape only on the letter stopped on, §7).

## 6. تخليص الحروف (orange)

**Always heavy:** خ ص ض غ ط ق ظ («خص ضغط قظ»). The ج is not heavy.

**The ر:**

- **heavy** with a fatha or a damma (or their tanween);
- **light** with a kasra (or its tanween);
- **sakin ر:** takes the weight of the haraka before it (heavy after a fatha or damma,
  light after a kasra). After a kasra and before a heavy letter in the same word it is heavy
  («قِرْطَاسٍ»). At the start of the reading, with nothing before, it is heavy.

**The lam of the name of Allah:** heavy (orange) after a fatha or a damma, light after a kasra.

**Where the time colour goes:** the letter is orange, and its sukun or shadda keeps the time
colour («اَ۬لصِّرَٰطَ»: an orange ص with a red shadda; «اَ۬لرَّحْمَٰنِ»: an orange ر with a cyan shadda).

## 7. The end of an ayah

Every ayah ends on a stop, and **the stop is on a sukun** (the Sheikh's rule).

- **The last letter** takes its time colour on its shape («اَ۬لْعَٰلَمِينَ»: a cyan ن), and on its sign if one is written.
- **Its written haraka stays navy**, as on the Sheikh's slides of al-Fatiha.
- **A tanween at the end of an ayah** is stopped on too: the letter takes its time colour («مَّسَدٍ»: a green د;
  «خَوْفٍ»: a red ف) and both strokes of the tanween are navy.
- **A fatha tanween on an alif** («سَبِيلاً») is read as a madd alif: the letter before it is not stopped on.
- **A final madd letter** («وَالضُّحَىٰ»): nothing to colour.
- **A final ر with a kasra** keeps its kasra (an ink ر with a navy kasra).
- **A final ة** is read as a sakin ه (red); its two dots stay ink.
- **What the KFGQPC text writes for reading on is dropped at the end of an ayah:** the pause mark after the last word
  (ۖ on almost every ayah), the small meem of iqlab into the next ayah or the next surah's basmalah («مَّسَدِۢ» → «مَّسَدٍ»),
  and the open tanween (ࣰ ࣱ ࣲ ٖ ٗ ٞ → ً ٌ ٍ).
- **The quarter-hizb mark «۞»** at the start of an ayah is not a word.


## 8. The Qalun spelling of the Tunisian mushaf

The KFGQPC Qalun text (King Fahd Complex) is the source. The Tunisian «المصحف المعلّم»
differs from it in these points, and the drills follow the Tunisian mushaf.

### 8.1 The doubled lam

«الذين، الذي، التي، الليل، لله» (after the article, or after the preposition lam before
the ه of Allah): KFGQPC writes the lam bare («اَ۬لذِينَ»، «لِلهِ»); the Tunisian mushaf writes
it with a shadda and a fatha («اَ۬لَّذِينَ»، «لِلَّهِ»).

- **The fatha** is written in: navy, graded like any haraka.
- **The shadda** is drawn, and is cyan (§3).

53 words. The article before a sun letter («اَ۬لصِّرَٰطَ») and «اللَّه» are unchanged.

### 8.2 A sakin noon before ي or و in the next word

KFGQPC: «فَمَنْ يَّعْمَلْ»، «مِنْ وَّرَآئِهِم». Tunisian: «فَمَن يَعْمَلْ»، «مِن وَرَآئِهِم»:
the noon bare, and no shadda on the ي or و.

- **The noon** is still sakin: purple, and إدغام بغنة in the table.
- **The ي or و** has no shadda to colour.

The drawing follows the Tunisian spelling (733 word pairs in the whole Quran).

### 8.3 The dotless ي of an alif

Where the text writes an alif as a ي with a small alif («أَدْرَيٰكَ»، «ضُحَيٰهَا»، «يَخْشَيٰهَا»),
the ي is drawn **without its two dots**: they mark the imala, which this reading does not use.
A ي with its own haraka before the small alif («يَٰأَيُّهَا») keeps its dots. 44 places.

### 8.4 The dotless final ي of «فِي»

«فِے»، «اِ۬لذِے»، «شَےْءٍ»: drawn as a dotless final ي (ى). 85 places.

### 8.5 Hamzat al-wasl

As the Sheikh writes it (his slides and his Level 2 workbook): **one black dot on the alif**, for the haraka it is
begun with when starting from it:

- **above** the alif: begun with a fatha (the article «ال»);
- **below** the alif: begun with a kasra («اِهْدِنَا»، «اِبْتِغَآءَ»);
- **in the middle**, beside the alif: begun with a damma.

The sila stroke of the KFGQPC text is not drawn. After a one-letter prefix («وَالْجِبَالَ»، «بِالْ…») the alif is
plain. Hamzat al-wasl takes no colour.

An alif with a dot alone, or a dot followed by a haraka («يَشَآءُ إِلَىٰ»، «شُهَدَآءَ إِذْ»), is not a hamzat al-wasl:
it is the second of two hamzas meeting across two words, eased or substituted by Qalun, and it is pronounced.

### 8.6 Numbers

Ayah numbers and every number on the site are in Western digits (1 2 3), as in the Sheikh's books.


## 9. The drills

They follow the Sheikh's lesson: **the coloured surah**, then **«اكتب السورة مع الضبط»**, then **«املأ الجداول»**.
Each level shows only the drills the Sheikh chose for it. Every drill works on the whole surah or ayah by ayah.

1. **ورقة الكتابة** (تدريب 1): the surah printed in faint outline in the framed page, to be written over with its dabt.
2. **التلوين:** the student picks a colour and taps a part (the letter, its shadda, sukun, haraka, or one stroke of a
   tanween). Each part is graded on its own.
3. **أزمنة الحروف:** each word goes into every column of a colour one of its letters takes.
4. **النون الساكنة والتنوين والميم الساكنة:** the Sheikh's table (الإظهار، الإدغام بغنة / بلا غنة، القلب، الإخفاء;
   الإدغام، الإخفاء، الإظهار الشفوي).
5. **المدود:** the word is given with its madd letter marked; the student picks the type (طبيعي، متصل، منفصل، لازم،
   عارض للسكون، بدل، لين، صلة صغرى، صلة كبرى) and its length for Qalun (2 / 2 or 4 / 4 or 5 / 6 / 2, 4 or 6). The check
   shows the reason. A whole surah gives at most two words of each type.
6. **الراءات:** تفخيم or ترقيق for each ra, with the reason.
7. **المخارج والصفات:** for the letters of the lesson (chosen by the Sheikh for each surah; the throat letters
   otherwise): the makhraj, the qualities with an opposite, and those without.
8. **همزة الوصل:** every hamzat al-wasl is a plain alif; the student picks one of the three forms (§8.5).

«وضع الامتحان» hides the answer and accepts one submission. Results go to the Sheikh when the student has joined a cohort.


## 10. Open points (to confirm with the Sheikh)

- **The meem al-jamʿ** («عَلَيْهِمْ»): Qalun reads it with sukun or with silah (عَلَيْهِمُو). The drills follow the written sukun.
- **A madd letter at the end of an ayah before a hamza** («تُجْزَىٰ ۝ إِلَّا»): the colouring stops on the ayah, the madd
  table counts it as منفصل (joining the ayahs), as in the Sheikh's workbook.

---

## Appendix: the characters of the KFGQPC Qalun text

For anyone implementing these rules on the same text.

| Character | Meaning |
|---|---|
| U+0870 ࡰ / U+0874 ࡴ / U+0872 ࡲ | alif of hamzat al-wasl, its sign above / below / in the middle |
| U+06EC ۬ / U+065C ٜ | begun with a fatha / with a kasra (after the wasl alif) |
| U+08F0 ࣰ U+08F1 ࣱ U+08F2 ࣲ | open tanween (fatha, damma, kasra): before a merged or hidden noon |
| U+06E2 ۢ (above) / U+06ED ۭ (below) | small meem of إقلاب |
| U+06E1 ۡ | sukun (KFGQPC form), the same as U+0652 |
| U+06D2 ے | dotless final ي («فِے»), drawn as ى |
| U+0670 ٰ | small alif |
| U+06E6 ۦ | small ي («يَسْرِۦ»: a ي dropped at the stop) |
| U+06D6–U+06DC | pause marks: never a letter's colour |
| U+06DE ۞ | quarter-hizb mark: not a word |
