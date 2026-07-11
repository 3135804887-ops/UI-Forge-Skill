# Full Catalog Build Evidence

- Date: 2026-07-11 (Asia/Shanghai)
- Input archive: `C:\tmp\ui-forge-components-v1.0.0.zip`
- Extracted source: `C:\tmp\ui-forge-components-v1.0.0-source`
- Final cleaned catalog: `C:\tmp\ui-forge-components-v1.1.0-clean`
- Independent repeat: `C:\tmp\ui-forge-components-v1.1.0-clean-repeat`
- Deterministic package: `C:\tmp\ui-forge-components-v1.1.0.zip`
- All generated data and ZIP files remain outside Git.

## Source inventory

The extracted archive has 47 top-level categories, 4,360 JSON records, 25,885 companion text files, 30,245 total files, and 84,903,691 uncompressed bytes. Its SHA-256 is `a862c3f3f4a3f3f14ca3ac8dc0eef62f33acf2b37e23adefb370eaf691715b8f`.

## Build and accounting

Both independent builds ran:

```powershell
node scripts/build-catalog.mjs --source 'C:\tmp\ui-forge-components-v1.0.0-source' --output 'C:\tmp\ui-forge-components-v1.1.0-clean' --json
node scripts/build-catalog.mjs --source 'C:\tmp\ui-forge-components-v1.0.0-source' --output 'C:\tmp\ui-forge-components-v1.1.0-clean-repeat' --json
```

Both exited `0` and reported:

| Measure | Count |
|---|---:|
| Input records | 4,360 |
| Parsed records | 4,357 |
| Repaired records | 3 |
| Merged records | 905 |
| Emitted records/component files | 3,455 |
| Rejected records | 0 |
| Duplicate groups | 755 |
| Complete | 99 |
| Incomplete | 3,356 |
| Recoverable | 0 |
| Invalid | 0 |

Both accounting identities hold: `4,357 + 3 = 4,360` and `3,455 + 905 + 0 = 4,360`. Summing `source_paths.length - 1` over all duplicate groups also gives 905. The rejected-record report is the empty array.

The three malformed JSON inputs—`Liquid_Metal`, `Static_Radial_Gradient`, and `Swirl` in the background category—were repaired from their companion code and each maps to a deterministic emitted record. Their duplicate groups may use a complete parseable record as the merge base, so final status is determined by the complete merged result rather than by the fact that one source member required repair.

## Integrity and code preservation

The final content digest is `89ea5545695e22b57b57b75ddd403aabad9245119d0ebab0a3dce0d80da89f25`. An earlier exploratory digest, `626ba7d70e4d01278875e86657623dd7e5c65e389ec3aae5cebfa36ad897542f`, came from a defective build that rejected normal v1.0 string code blocks and is invalidated; it is not a distributable result.

The two final directories each contain 3,459 files. Their recursive relative-path sets are equal, every corresponding file SHA-256 is equal, and all three report files are byte-identical. The cleaned directory is 43,633,667 bytes.

Additional invariant checks found:

- 3,455 unique IDs for 3,455 emitted records.
- Zero runtime records with metadata URLs and zero diagnostics containing URLs.
- Zero generated `_code_*.txt` files.
- Zero non-invalid records without a code block.
- All 25,885 usable legacy source code blocks are represented in emitted records after deterministic newline normalization; zero source blocks are unmatched.
- A singleton code block containing functional external resource references is exactly equal to its emitted code string; only URL-free asset hashes appear in metadata.

## Runtime CLI evidence

```powershell
node scripts/ui-forge.mjs validate --catalog 'C:\tmp\ui-forge-components-v1.1.0-clean' --json
node scripts/ui-forge.mjs search 'animated button' --category button --limit 5 --catalog 'C:\tmp\ui-forge-components-v1.1.0-clean' --json
node scripts/ui-forge.mjs search 'animated button' --category button --limit 5 --include-incomplete --catalog 'C:\tmp\ui-forge-components-v1.1.0-clean' --json
node scripts/ui-forge.mjs show 'ai-chat/prompt-input-dynamic-grow--3ba0dfa1' --catalog 'C:\tmp\ui-forge-components-v1.1.0-clean' --json
node scripts/ui-forge.mjs show 'button/animated-button--02ab4c4a' --catalog 'C:\tmp\ui-forge-components-v1.1.0-clean' --json
```

Validation exited `0` with 3,455 components and no errors or warnings. The default search exited `0` with no results because all matching button records are `incomplete` and the stable default excludes that status; it returned a related category suggestion. Repeating with `--include-incomplete` returned five stable code-free summaries. `show` returned both a complete record (one code block, 19,002 code characters, no unresolved local import) and an incomplete record (one code block, 123 code characters, one unresolved local import).

## Deterministic package

The package was created with:

```powershell
node scripts/package-catalog.mjs --source 'C:\tmp\ui-forge-components-v1.1.0-clean' --output 'C:\tmp\ui-forge-components-v1.1.0.zip' --checksum 'C:\tmp\ui-forge-components-v1.1.0.zip.sha256' --json
```

The ZIP contains 3,459 files and is 44,221,247 bytes. Its SHA-256 is `da9110312036932c6e861cc1741710775280a76093a54a16894c15f238efaa91`. Packaging the independent repeat directory produced the same size and SHA-256. The archive has no wrapper folder: its root directly contains `manifest.json`, `components/`, and `reports/`.

After extraction to `C:\tmp\ui-forge-components-v1.1.0-unpacked`, `validate` again exited `0`. The unpacked tree has the same 3,459 relative paths as the source cleaned directory and zero corresponding file-hash mismatches.

Post-review transaction tests directly assert ordinal ZIP entry order, fixed DOS timestamps, Unix `100644` attributes, exact root paths, and checksum content. They also inject failures during the second backup rename, checksum promotion, rollback, and post-success cleanup. Pre/full-promotion failures restore the previous ZIP/checksum bytes and clean ordinary temporary files; incomplete rollback preserves all remaining recovery material and reports state/paths; post-success cleanup failure retains a consistent new pair and returns warnings with exit `0`. Repackaging the formal artifact through this hardened path did not change its size or SHA-256.
