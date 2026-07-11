# Catalog Configuration

UI Forge keeps its catalog separate from the skill. Each command discovers the first readable catalog with a supported `manifest.json` in this order:

1. `--catalog <path>`
2. `UI_FORGE_CATALOG`
3. the nearest `.ui-forge.json`, walking from the current directory to the filesystem root
4. the user's UI Forge configuration file
5. platform data locations, followed by `~/.ui-forge/catalog`

## Configuration file

Both project and user configuration use this shape:

```json
{
  "catalog": "/path/to/ui-forge-catalog"
}
```

A relative `catalog` value is resolved from the directory containing that configuration file. This makes project configuration portable inside a repository.

## Platform locations

| Platform | User config | Common data catalog |
|---|---|---|
| Windows | `%APPDATA%/ui-forge/config.json` | `%LOCALAPPDATA%/ui-forge/catalog` |
| macOS | `~/Library/Application Support/ui-forge/config.json` | `~/Library/Application Support/ui-forge/catalog` |
| Linux | `${XDG_CONFIG_HOME:-~/.config}/ui-forge/config.json` | `${XDG_DATA_HOME:-~/.local/share}/ui-forge/catalog` |

All platforms also check `~/.ui-forge/catalog` last. These are defaults, not hard-coded requirements.

## Troubleshooting

Run `node scripts/ui-forge.mjs validate --json`. Discovery failures exit with code `2` and list every checked path and reason. An explicit candidate that is missing or unsupported does not stop discovery; a later valid candidate may be selected. Use `--catalog` when diagnosing precedence, and validate the extracted catalog rather than its parent directory.

