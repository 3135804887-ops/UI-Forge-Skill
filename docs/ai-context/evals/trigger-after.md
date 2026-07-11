# UI Forge Trigger Evaluation After Rewrite

- Skill revision: Task 8 working tree before commit
- Dataset: the original 13 cases plus 5 review-added non-React adversarial negatives in `tests/skill-trigger-cases.json`
- Method: one fresh-context evaluator read only `SKILL.md`; expected labels and baseline results were hidden
- Result: 18/18 cases matched expected labels

| Case | Expected | Observed verdict | Pass |
|---|---:|---|---:|
| `en-explicit-forge` | true | trigger | yes |
| `en-existing-component` | true | trigger | yes |
| `en-category-options` | true | trigger | yes |
| `en-generic-page` | false | no-trigger | yes |
| `en-debug` | false | no-trigger | yes |
| `en-figma-review` | false | no-trigger | yes |
| `en-vue-migration` | false | no-trigger | yes |
| `en-vue-category-options` | false | no-trigger | yes |
| `en-swiftui-category-options` | false | no-trigger | yes |
| `en-html-category-options` | false | no-trigger | yes |
| `zh-explicit-forge` | true | trigger | yes |
| `zh-existing-component` | true | trigger | yes |
| `zh-category-options` | true | trigger | yes |
| `zh-generic-page` | false | no-trigger | yes |
| `zh-debug` | false | no-trigger | yes |
| `zh-vue-category-options` | false | no-trigger | yes |
| `zh-swiftui-implementation` | false | no-trigger | yes |
| `zh-html` | false | no-trigger | yes |

## Raw rationales

- Explicit UI Forge cases triggered because the user named the skill and requested component discovery.
- Existing-component cases triggered because they explicitly requested ready-made React components for selection or reuse.
- Category-option cases triggered because they asked which existing catalog options were available.
- Generic React creation, React debugging, Figma review, Vue migration, Vue/SwiftUI/native-HTML category-option requests, and non-React implementation did not trigger because the frontmatter itself limits discovery to ready-made React components or a local React catalog and explicitly excludes non-React component requests.

The hardened rewrite preserved all six intended activation cases while eliminating the seven original false-positive classes and all five adversarial non-React cases. The original 13 cases were not tuned; review added only new negative classes.
