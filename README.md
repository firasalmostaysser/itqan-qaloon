# الطريق إلى الإتقان

تعلّم تلاوة القرآن الكريم **برواية قالون عن نافع** بطريقة الألوان للشيخ المقرئ **محمّد بن عبد الله جوّاد**: المصحف كاملاً بخطّ قالون العثماني من مجمّع الملك فهد، كل حرف وكل علامة ملوّنان بحسب حكمهما، ونطق الشيخ لكل كلمة، ودروس متدرّجة وجداول تدريب.

المشروع وقفٌ وصدقة جارية: الموقع ملفات ثابتة فقط، بلا خادم ولا قاعدة بيانات ولا اشتراك، فيبقى يعمل مجاناً ولو لم يعتنِ به أحد.

## كيف يعمل

| الجزء | المكان |
| --- | --- |
| الموقع الذي يفتحه الطلاب | مجلد `site/` (ملفات ثابتة تُنشر على GitHub Pages وCloudflare Pages) |
| إعدادات الشيخ (الألوان، تعديلات الكلمات، الملاحظات، روابط الفيديو) | ملف واحد: `site/data/state.json` |
| فيديوهات الشيخ | على archive.org، وروابطها في `state.json` |
| محرّك الألوان | `src/engine.js` (يعمل في متصفّح الطالب) |
| واجهة الموقع | `src/app.js` و`src/style.css` و`src/index.html` |
| نصّ قالون وخطّه | `third_party/kfgqpc/qaloon/` (مجمّع الملك فهد، الإصدار 10) |

يدخل الشيخ من رابط «دخول الشيخ» أسفل الصفحة (أو `#admin`) برمز GitHub مرة واحدة على جهازه، فيحفظ تعديلاته مباشرة في `state.json`، ثم يُعاد نشر الموقع تلقائياً خلال دقائق.

## التشغيل محلياً

```bash
cd site && python3 -m http.server 8000
# ثم افتح http://localhost:8000
```

## إعادة البناء

بعد تعديل الملفات في `src/`:

```bash
cd build
npm install      # مرة واحدة
npm run page     # يبني site/index.html
npm run data     # يعيد تشكيل نصّ المصحف (عند تغيير الخطّ أو النص فقط)
npm test         # يعرض ألوان الفاتحة والمسد والإخلاص للمراجعة
```

## النشر والاستمرار

خطوات الاستضافة المجانية ونقل الملكية في [docs/HOSTING.md](docs/HOSTING.md).

---

## English summary

A free web app for learning Quran recitation in the Qaloon narration with the six-colour method of Sheikh Muhammad bin Abdullah Jawwad. The whole Quran is rendered from the KFGQPC Qaloon text and font. Every letter body and diacritic is coloured by a client-side tajweed engine, and the sheikh can override any word.

The design goal is permanence at zero cost: `site/` is plain static files served from GitHub Pages and Cloudflare Pages, with videos on archive.org. The sheikh's edits live in `site/data/state.json` and are committed through the GitHub API from his dashboard. See [docs/HOSTING.md](docs/HOSTING.md) for setup and [NOTICE.md](NOTICE.md) for third-party terms.
