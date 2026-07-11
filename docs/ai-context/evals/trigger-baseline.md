# UI Forge Trigger Baseline

- Skill revision: `da48a8b`
- Dataset: `tests/skill-trigger-cases.json`
- Method: fresh-context classification without expected labels

| Case | Expected | Observed verdict | Pass |
|---|---:|---|---:|
| `en-explicit-forge` | true | trigger | yes |
| `en-existing-component` | true | trigger | yes |
| `en-category-options` | true | trigger | yes |
| `en-generic-page` | false | trigger (3/3 repetitions) | no |
| `en-debug` | false | trigger (3/3 repetitions) | no |
| `en-figma-review` | false | trigger | no |
| `en-vue-migration` | false | trigger | no |
| `zh-explicit-forge` | true | trigger | yes |
| `zh-existing-component` | true | trigger | yes |
| `zh-category-options` | true | trigger | yes |
| `zh-generic-page` | false | trigger (3/3 repetitions) | no |
| `zh-debug` | false | trigger | no |
| `zh-html` | false | trigger | no |

## Baseline failure pattern

The current skill over-triggered on every negative case (7/7), while all positive cases triggered (6/6). All three repetitions of each broad negative case also triggered, so the observed behavior was stable rather than variable.

The exact repeated rationale for `en-generic-page` was: “ALWAYS use this when the user is building a frontend” and “User is working on a dashboard, landing page, or web app.” The three agents proposed first searching for landing-page components or identifying hero, CTA, and testimonial components.

The exact repeated rationale for `zh-generic-page` was: “ALWAYS use this when the user is building a frontend” and the explicit inclusion of “User is working on a dashboard.” The three agents first proposed understanding dashboard requirements and identifying relevant component categories.

The `en-debug` repetitions all treated bug fixing as skill-triggering frontend work. Their rationales cited “User is building a frontend or web application,” the inclusion of “forms,” the `ALWAYS` sentence, and the instruction to “proactively suggest relevant components from this library.”

The same wording enabled the other false positives: “User wants to improve their design or UI” and “User is working on a dashboard” triggered the Figma review; “ALWAYS use this when the user is building a frontend” triggered Vue migration and native HTML; and the general frontend/proactive-component wording triggered the Chinese React modal debugging case.

These results demonstrate the required RED condition before rewriting the trigger: the current description treats generic creation, review, migration, and debugging as catalog-discovery requests even when the user neither names UI Forge nor asks to find or reuse existing components.
