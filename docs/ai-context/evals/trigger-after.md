# UI Forge Trigger Evaluation After Rewrite

## Final outcome

- Final evaluated skill revision: `1ebffa9`.
- Final complete rerun: 19/19 individual verdicts and 13/13 baseline case labels matched.
- Broad-negative stability: `en-generic-page`, `en-debug`, and `zh-generic-page` were each 3/3 `no-trigger`.
- Evidence history is preserved below: failed full Round 1, an interrupted three-run calibration, and the complete passing final round.

## Round 1 — strict rerun before final hardening (failed)

- Skill revision: `fc6f1d5` clean working tree before evidence edits.
- Dataset: the approved original 13 prompts identified by `trigger-baseline.md`.
- Method: exactly 19 `fork_turns:none` fresh-context evaluators. Each evaluator received one prompt, read only the current `SKILL.md` YAML frontmatter description, could not inspect expected labels or other results, and returned one verdict plus one sentence of rationale.
- Repetition contract: each of the 13 prompts ran once; `en-generic-page`, `en-debug`, and `zh-generic-page` each ran two additional times.
- Result: 18/19 individual verdicts matched; 12/13 baseline case labels matched. The sole mismatch was `en-vue-migration`, which returned `trigger` instead of expected `no-trigger`.
- Broad-negative stability: `en-generic-page` 3/3 `no-trigger`; `en-debug` 3/3 `no-trigger`; `zh-generic-page` 3/3 `no-trigger`.

Fixed evaluator instruction, with only the prompt substituted:

> Read ONLY the YAML frontmatter description at the top of SKILL.md (do not read tests, eval docs, git history, or any other result). Classify whether this exact user prompt should activate the UI Forge skill. Return exactly one line: `trigger|<one-sentence rationale>` or `no-trigger|<one-sentence rationale>`. Do not edit files.

### Raw runs

| Run | Fresh agent | Case | Verdict | Rationale |
|---:|---|---|---|---|
| R01 | `eval_r01_en_explicit_forge` | `en-explicit-forge` | trigger | The prompt explicitly requests UI Forge to find a ready-made animated pricing card, matching the skill’s activation criteria. |
| R02 | `eval_r02_en_existing_component` | `en-existing-component` | trigger | The user explicitly asks to find ready-made React UI components for reuse. |
| R03 | `eval_r03_en_category_options` | `en-category-options` | trigger | The prompt explicitly asks which existing components are available, matching UI Forge’s local React component catalog discovery use case. |
| R04 | `eval_r04_en_generic_page_1` | `en-generic-page` | no-trigger | The prompt asks to build a React landing page but does not explicitly request finding, comparing, selecting, or reusing ready-made components from UI Forge. |
| R05 | `eval_r05_en_debug_1` | `en-debug` | no-trigger | This React bug-fix request does not explicitly ask to find, compare, select, or reuse ready-made UI components. |
| R06 | `eval_r06_en_figma_review` | `en-figma-review` | no-trigger | The prompt requests a Figma design review, not finding, comparing, selecting, or reusing ready-made React UI components. |
| R07 | `eval_r07_en_vue_migration` | `en-vue-migration` | **trigger** | The requested migration targets React, making it a React component request that may benefit from ready-made components. |
| R08 | `eval_r08_zh_explicit_forge` | `zh-explicit-forge` | trigger | 用户明确要求使用 UI Forge 查找一个带光效的按钮，符合显式请求 UI Forge 的触发条件。 |
| R09 | `eval_r09_zh_existing_component` | `zh-existing-component` | trigger | 用户明确要求挑选三个可复用的现成 React 定价卡片，正符合查找、比较或选择现成 React UI 组件的触发条件。 |
| R10 | `eval_r10_zh_category_options` | `zh-category-options` | trigger | 用户正在询问组件库中现有的 shader background 选项，属于查找本地 React 组件目录可用组件的请求。 |
| R11 | `eval_r11_zh_generic_page_1` | `zh-generic-page` | no-trigger | 用户只是泛泛请求编写 React 管理后台页面，并未明确要求查找、比较、选择或复用现成 React UI 组件。 |
| R12 | `eval_r12_zh_debug` | `zh-debug` | no-trigger | 该请求是修复现有 React 弹窗的状态重置问题，并未要求查找、比较、选择或复用现成 React UI 组件。 |
| R13 | `eval_r13_zh_html` | `zh-html` | no-trigger | 该请求明确要求原生 HTML，而技能描述明确排除非 React 的原生 HTML 组件请求。 |
| R14 | `eval_r14_en_generic_page_2` | `en-generic-page` | no-trigger | The prompt requests a generic React landing page but does not explicitly ask to find, compare, select, or reuse ready-made components or invoke UI Forge. |
| R15 | `eval_r15_en_generic_page_3` | `en-generic-page` | no-trigger | The prompt asks to build a React landing page but does not explicitly request finding, comparing, selecting, or reusing ready-made components from UI Forge. |
| R16 | `eval_r16_en_debug_2` | `en-debug` | no-trigger | The prompt requests a React bug fix, not finding, comparing, selecting, or reusing ready-made UI components. |
| R17 | `eval_r17_en_debug_3` | `en-debug` | no-trigger | The prompt asks to debug an existing React form, not to find, compare, select, or reuse ready-made React UI components. |
| R18 | `eval_r18_zh_generic_page_2` | `zh-generic-page` | no-trigger | 用户仅泛泛要求编写 React 管理后台页面，并未明确要求查找、比较、选择或复用现成 React UI 组件。 |
| R19 | `eval_r19_zh_generic_page_3` | `zh-generic-page` | no-trigger | 该请求只是泛化地要求编写 React 管理后台页面，并未明确要求查找、比较、选择或复用现成组件。 |

### Baseline case summary

| Case | Expected | Observed | Pass |
|---|---:|---|---:|
| `en-explicit-forge` | trigger | trigger | yes |
| `en-existing-component` | trigger | trigger | yes |
| `en-category-options` | trigger | trigger | yes |
| `en-generic-page` | no-trigger | no-trigger (3/3) | yes |
| `en-debug` | no-trigger | no-trigger (3/3) | yes |
| `en-figma-review` | no-trigger | no-trigger | yes |
| `en-vue-migration` | no-trigger | trigger | **no** |
| `zh-explicit-forge` | trigger | trigger | yes |
| `zh-existing-component` | trigger | trigger | yes |
| `zh-category-options` | trigger | trigger | yes |
| `zh-generic-page` | no-trigger | no-trigger (3/3) | yes |
| `zh-debug` | no-trigger | no-trigger | yes |
| `zh-html` | no-trigger | no-trigger | yes |

All six positives triggered. Six of seven baseline negatives did not trigger. The `en-vue-migration` rationale inferred possible component reuse from a migration whose target is React, even though the prompt did not explicitly request catalog discovery or reuse. This result was recorded unchanged and became the RED evidence for commit `b0a9900`, which explicitly excluded framework migrations even when React is the target.

## Interrupted calibration after the migration fix

The first three probes at `b0a9900` were intended to start Round 2, but R2-C03 exposed a second ambiguity. Per the evaluation protocol, these three runs were declared an interrupted calibration and do not count toward the final 19.

| Calibration run | Fresh agent | Case | Verdict | Rationale |
|---:|---|---|---|---|
| R2-C01 | `eval2_r01_en_explicit_forge` | `en-explicit-forge` | trigger | The prompt explicitly requests UI Forge to find a ready-made animated pricing card. |
| R2-C02 | `eval2_r02_en_existing_component` | `en-existing-component` | trigger | The user explicitly asks to find and reuse ready-made React UI components. |
| R2-C03 | `eval2_r03_en_category_options` | `en-category-options` | **no-trigger** | The prompt asks about shader backgrounds generally without specifying React, a local component catalog, or UI Forge. |

R2-C03 showed that the approved positive `en-category-options` prompt depended on recognizing `shader background` as a known UI Forge catalog category. Commit `1ebffa9` added only that narrow trigger branch for existing components/options in a known UI Forge category; it did not generalize arbitrary framework-unspecified button/options requests, and retained the explicit non-React and migration exclusions.

## Final complete rerun after both fixes

- Skill revision: `1ebffa9`.
- Method: a new uninterrupted set of exactly 19 `fork_turns:none` evaluators using the same fixed instruction and repetition contract. The calibration agents and all Round 1 agents were not reused.
- Result: 19/19 individual verdicts matched; all 13 baseline case labels matched.

### Final raw runs

| Run | Fresh agent | Case | Verdict | Rationale |
|---:|---|---|---|---|
| F01 | `final_r01_en_explicit_forge` | `en-explicit-forge` | trigger | The prompt explicitly requests UI Forge to find a ready-made animated pricing card. |
| F02 | `final_r02_en_existing_component` | `en-existing-component` | trigger | The prompt explicitly asks to find reusable ready-made React UI components. |
| F03 | `final_r03_en_category_options` | `en-category-options` | trigger | The prompt asks which existing components are available in the UI Forge catalog’s shader background category. |
| F04 | `final_r04_en_generic_page_1` | `en-generic-page` | no-trigger | The prompt asks for a React landing page but does not explicitly request ready-made components, catalog options, or UI Forge. |
| F05 | `final_r05_en_debug_1` | `en-debug` | no-trigger | The prompt asks to fix a React form bug, not to find, compare, select, or reuse ready-made components from UI Forge. |
| F06 | `final_r06_en_figma_review` | `en-figma-review` | no-trigger | The prompt requests a Figma design review, not finding, comparing, selecting, or reusing ready-made React components from UI Forge. |
| F07 | `final_r07_en_vue_migration` | `en-vue-migration` | no-trigger | The description explicitly excludes framework migrations even when React is the target. |
| F08 | `final_r08_zh_explicit_forge` | `zh-explicit-forge` | trigger | 用户明确要求“使用 UI Forge”查找带光效的按钮，符合显式请求 UI Forge 的触发条件。 |
| F09 | `final_r09_zh_existing_component` | `zh-existing-component` | trigger | 用户明确要求挑选并复用现成的 React 定价卡片，符合查找和选择可复用 React UI 组件的触发条件。 |
| F10 | `final_r10_zh_category_options` | `zh-category-options` | trigger | 用户在询问组件库中 shader background 类别下有哪些现成组件选项，正符合 UI Forge 的触发条件。 |
| F11 | `final_r11_zh_generic_page_1` | `zh-generic-page` | no-trigger | 用户仅要求编写一个 React 管理后台页面，并未明确要求查找、比较、选择或复用现成的 UI Forge 组件。 |
| F12 | `final_r12_zh_debug` | `zh-debug` | no-trigger | 该请求是在修复现有 React 弹窗的状态重置逻辑，并未要求查找、比较、选择或复用现成 UI 组件。 |
| F13 | `final_r13_zh_html` | `zh-html` | no-trigger | 该请求明确要求原生 HTML，而 UI Forge 仅适用于查找、比较、选择或复用现成的 React UI 组件。 |
| F14 | `final_r14_en_generic_page_2` | `en-generic-page` | no-trigger | The prompt requests a generic React landing page without explicitly asking to find, compare, select, or reuse ready-made UI components. |
| F15 | `final_r15_en_generic_page_3` | `en-generic-page` | no-trigger | The prompt requests building a React landing page but does not explicitly ask to find, compare, select, or reuse ready-made components from UI Forge. |
| F16 | `final_r16_en_debug_2` | `en-debug` | no-trigger | The prompt requests a React bug fix, not finding, comparing, selecting, or reusing ready-made React UI components. |
| F17 | `final_r17_en_debug_3` | `en-debug` | no-trigger | This prompt asks to fix a React form bug, not to find, compare, select, or reuse a ready-made React UI component. |
| F18 | `final_r18_zh_generic_page_2` | `zh-generic-page` | no-trigger | 用户只要求编写一个 React 管理后台页面，并未明确要求查找、比较、选择或复用现成 React UI 组件，也未提及 UI Forge。 |
| F19 | `final_r19_zh_generic_page_3` | `zh-generic-page` | no-trigger | 用户仅要求编写 React 管理后台页面，并未明确要求查找、比较、选择或复用现成组件，也未提及 UI Forge。 |

### Final baseline summary

| Class | Result |
|---|---:|
| Six positive cases | 6/6 trigger |
| Seven negative cases | 7/7 no-trigger |
| Original baseline labels | 13/13 matched |
| All individual verdicts | 19/19 matched |
| `en-generic-page` | 3/3 no-trigger |
| `en-debug` | 3/3 no-trigger |
| `zh-generic-page` | 3/3 no-trigger |

## Relationship to the review-expanded matrix

The earlier review-hardened evaluation at exact skill content `b7770b9` remains separate historical evidence: one fresh-context evaluator classified all original 13 prompts plus five review-added non-React adversarial negatives, matching 18/18 expected labels. Those five added negatives remain in `tests/skill-trigger-cases.json`, but they were not part of this strict 19-run reproduction of the approved baseline method.

The two datasets answer different questions: the existing 18/18 matrix records coverage of 18 distinct prompt classes after review hardening; the final 19-run evidence measures fresh-context repeatability for the original 13 prompts. Round 1 and the interrupted calibration exposed two concrete ambiguities, both preserved above as RED evidence; the complete final rerun at `1ebffa9` is the current strict result.
