# Changelog

## 0.0.6

- The package includes this changelog, so the Marketplace, Open VSX and VS Code show it.

## 0.0.5

**Breaking:** settings and commands now use the `zenc-lang-ce` prefix instead of `zenc`, which another Zen C extension also uses. A `zenc.serverPath` set with 0.0.4 is not read any more: set it again as `zenc-lang-ce.serverPath`, or pick the server when the extension asks for it.

- Settings renamed: `zenc-lang-ce.serverPath`, `zenc-lang-ce.server.verbose`, `zenc-lang-ce.server.enable` and `zenc-lang-ce.trace.server`.
- When `zc-lsp` is not in PATH, or `zenc-lang-ce.serverPath` points to a file that does not exist, the extension asks where the language server is and saves the answer in that setting.

## 0.0.4

First release under the `zenc-lang-ce` publisher, as "Zen C - CE".

- Starts `zc-lsp` directly instead of the deprecated `zc lsp`. `serverPath` may still point to the `zc` compiler: the `zc-lsp` next to it is used, or `zc lsp` with older compilers.
- New command **Zen C: Restart Language Server**. The server also restarts when its settings change.
- New command **Zen C: Show Language Server Output**, and settings to log what the server does (`server.verbose`) and to trace its messages (`trace.server`).
- New setting `server.enable` to turn the language server off; highlighting and editing support remain.
- The extension is bundled with esbuild, so it is smaller and loads faster.
