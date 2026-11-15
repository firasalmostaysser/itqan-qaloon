# Tajweed colouring rules: the Sheikh's method, Qalun reading

The rules this project uses to colour the Quran text and grade the drills, as they
stand on 2026-11-13. They follow the method of the Sheikh, al-Muqri' Muhammad ibn
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
- **A noon followed by a waqf mark inside the ayah:** the reader may stop there, so it
  has no ghunnah **(to confirm, §10)**.

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
- **A noon, mim or tanween merged into «نّ» or «مّ»** («رَبِّهِم مِّن»، «فَلَن نَّزِيدَكُمْ»، «جَزَآءً مِّن»):
  **no colour of its own**, because the next letter's shadda already carries the ghunnah (§5.1).
  42 places. Merged into و or ي, the purple stays on the noon or tanween (their shadda is not a ghunnah).
- **A tanween read clearly (إظهار)** («يُسْراً ۝ إِنَّ»): its noon is a sakin noon, so its
  second stroke is **cyan (ساكن بيني)** **(to confirm)**. 47 places.
- **A tanween before ل or ر, or before hamzat al-wasl:** its second stroke takes no colour.

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

### 7.1 The stop

The last letter of each ayah (in the Qalun count) and of the basmalah is **read with a
sukun**. The reader stops on it, so:

- **its time colour goes on its shape**, and on its sign if one is written («اَ۬لْعَٰلَمِينَ»:
  the final ن is cyan; «عَلَيْهِمْ» closing ayah 6: the م and its sukun are cyan);
- **its written haraka is still navy**, as on the Sheikh's al-Fatiha slides;
- **a final ن or م has no ghunnah**, unless doubled;
- **a heavy last letter stays orange** («اَ۬لْفَلَقِ»);
- **a final ة is read as a sakin ه** (رخو, red), and only its shape is coloured: its two dots
  stay ink («اَ۬لْقَارِعَةُ»).

### 7.2 Exceptions to the stop

- **A final madd letter** («وَالضُّحَىٰ»): no sukun, nothing to colour.
- **A final ر with a kasra** («اَ۬لْقَدْرِ»، «وَالْفَجْرِ»، «اَ۬لصُّدُورِ»): it keeps its kasra
  and is not stopped on, so it is an ink ر with a navy kasra. 9 ayah ends.
  A final ر with a fatha or damma is stopped on and takes the weight of the haraka before
  it («اَ۬لْكَوْثَرَ»، «اَ۬لْأَبْتَرُ»: orange).
- **A tanween at the end of an ayah is read on** into the next ayah: its ghunnah follows the
  first letter of the next ayah («يُسْراً ۝ فَإِذَا»: إخفاء, the second stroke purple;
  «تَقْوِيمٍ ۝ ثُمَّ»: إخفاء), and its letter is not stopped on. A final ة with a tanween is
  then read as ت **(to confirm, §10)**. 165 ayah ends.
  The mushaf agrees: before a merged or hidden noon it writes the open tanween (ࣰ ࣱ ࣲ),
  and the plain one (ً ٌ ٍ) before إظهار.
- **The last ayah of a surah** reads on into the next surah's basmalah (it starts with ب), so a
  final tanween there is إقلاب: the mushaf writes it with the small meem («أَحَدُۢ»، «مَّسَدِۢ»).
  Not after an-Nas, and not before at-Tawba (no basmalah). 13 surah ends.
- **The quarter-hizb mark «۞»** at the start of an ayah is not a word: reading on skips it.
- **A waqf mark on the last letter of an ayah** («۝ۖ») changes nothing.
- **Waqf marks inside an ayah are not stops**, except for the ghunnah of a noon or tanween
  just before one **(to confirm, §10)**.

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

12 word pairs.

### 8.3 The dotless ي of an alif

Where the text writes an alif as a ي with a small alif («أَدْرَيٰكَ»، «ضُحَيٰهَا»، «يَخْشَيٰهَا»),
the ي is drawn **without its two dots**: they mark the imala, which this reading does not use.
A ي with its own haraka before the small alif («يَٰأَيُّهَا») keeps its dots. 44 places.

### 8.4 The dotless final ي of «فِي»

«فِے»، «اِ۬لذِے»، «شَےْءٍ»: drawn as a dotless final ي (ى). 85 places.

### 8.5 Hamzat al-wasl

The mushaf marks hamzat al-wasl with a sign on the alif:

- **its place** is the haraka before it: **above** after a fatha (168), **below** after a kasra (99),
  **in the middle** after a damma (86);
- **a small sign** shows the haraka it is begun with when starting from it: «۬» a fatha
  (the article «ال»), «ٜ» a kasra («اِهْدِنَا»، «اِتَّخَذَ»).

That gives six forms. After a one-letter prefix («وَالْجِبَالَ»، «فَالْ…»، «بِالْ…») the alif
is written plain, with no sign (89 places). Hamzat al-wasl takes no colour.

## 9. The drills

The answers come from the rules above. **«تحقّق» and «اعرض الحل» are for the teacher.**

In the three colour and table drills, hamzat al-wasl is drawn as a **plain alif**, so they do
not give away the fourth drill. The teacher's presentation («عرض») keeps its marks.

1. **التلوين:** the student picks one of the six colours and taps a letter. The brush puts
   each colour on its part (§1–§6):
   - a ساكن colour on the sukun or shadda (on the shape of a letter stopped on);
   - navy on the harakat;
   - purple on the second stroke of a tanween, the small meem, the shadda of «نّ مّ», or the letter;
   - orange on the letter.

   Grading counts each asked part once, in the layer of its colour. A colour on a part
   that asks for none counts as extra.
2. **أزمنة الحروف:** ayah by ayah, each word goes into every column of a colour one of its
   letters takes (رخو، بيني، شديد، الغنة، الحركات، التخليص). One word can go into several columns.
   The basmalah opens the drill.
3. **أحكام النون الساكنة والتنوين والميم الساكنة:** the Sheikh's table, ayah by ayah:
   - **النون الساكنة والتنوين:** الإظهار، الإدغام (بغنة / بلا غنة)، القلب، الإخفاء;
   - **الميم الساكنة:** الإدغام، الإخفاء، الإظهار.

   The table reads on across ayah ends. «نّ / مّ» are not asked: they have no column.
   After checking, each rule shows on the part the colouring drill colours (§5.4), in that
   colour. A rule merged into «لّ / رّ» shows on that shadda.
4. **همزة الوصل:** every marked hamzat al-wasl is a plain alif. The student picks one of the
   six forms (§8.5). The answer is the mushaf's own form. The 89 unmarked alifs after a prefix
   are not asked.

## 10. Open points (to confirm with the Sheikh)

- **The tanween read clearly (إظهار):** is its second stroke cyan (ساكن بيني) (§5.4)?
- **A ة with a tanween at the end of an ayah** («خَٰشِعَةٌ»، «وَاجِفَةٌ»، 38 places): read on, as
  now (an ink ة, the tanween's noon coloured), or stopped and read as ه (§7.1)?
- **A tanween or noon before a «ۖ» (صلى) inside the ayah** («شَيْـٔاً ۖ وَالْأَمْرُ» 82:19,
  «مِسْكٌ ۖ وَفِے» 83:26): no ghunnah, as a stop (now), or read on with its ghunnah, as صلى prefers?
  The table drill already reads on.
- **The meem al-jamʿ** («عَلَيْهِمْ»): Qalun reads it with sukun or with silah (عَلَيْهِمُو). The
  drills follow the written sukun.
- **The Hafs text** of the first version (M0) follows older rules and is not covered here.

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
