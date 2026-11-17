# The school database (Supabase)

Schema `itqan` (not exposed by the API): `teachers` (hashed keys), `levels` (program, surahs, config: drills and lesson
letters), `cohorts` (join code, live link, schedule), `students` (hashed tokens), `sessions`, `attendance`,
`evaluations` (seven criteria out of 10), `attempts` (drill results and mistakes).

The page calls only these functions (`site/data/site.json` holds the project URL and its publishable key):

| Function | Who | What |
|---|---|---|
| `itqan_join(code, name)` | student | joins a cohort, returns his token and his page |
| `itqan_me(token)` | student | level, surahs, drills, sessions with his attendance, evaluations, progress |
| `itqan_attempt(token, …)` | student | saves one drill result |
| `itqan_t_data(key)` | cheikh | everything for the follow-up page |
| `itqan_t_save(key, kind, row)` / `itqan_t_delete(key, kind, id)` | cheikh | levels, cohorts, students, sessions, attendance, evaluations |
| `itqan_t_level_program(key, id, program)` | cheikh | moves a level to a program |
| `itqan_t_student(key, id)` | cheikh | one student's full record |

Without the database the site still works: drills and results stay on the device.
