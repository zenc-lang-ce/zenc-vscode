# Zen C for VS Code

This extension provides language support for the [Zen C](https://github.com/zenc-lang-ce/zenc) programming language.

## Features

-   **Syntax Highlighting**: Colorization for keywords, types, functions, strings, and comments.
-   **IntelliSense**: Code completion for local variables, function arguments, and struct fields.
-   **Hover**: Documentation and type information on hover.
-   **Go to Definition**: Navigate to symbol definitions.
-   **Diagnostics**: Real-time error reporting and type checking.

## Requirements

You must have the Zen C compiler installed. The extension starts its language server, `zc-lsp`, which `make install` puts next to `zc`: either have it in your PATH or set `zenc.serverPath`.

## Installation

### From Marketplace
Install via VS Code Marketplace: [Zen C - CE](https://marketplace.visualstudio.com/items?itemName=zenc-lang-ce.zenc)

Install via Open VSX (VSCodium, Cursor and other editors): [Zen C - CE](https://open-vsx.org/extension/zenc-lang-ce/zenc)

### From Source
1.  Clone the repository:
    ```bash
    git clone https://github.com/zenc-lang-ce/zenc-vscode.git
    cd zenc-vscode
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Open in VS Code:
    ```bash
    code .
    ```
4.  Press **F5** to build and launch the extension in debug mode.

## Configuration

This extension contributes the following settings:

*   `zenc.serverPath`: Path to the language server (`zc-lsp`). Empty by default: `zc-lsp` is looked up in your PATH. A path to the `zc` compiler also works: the `zc-lsp` next to it is used, or `zc lsp` with compilers that predate `zc-lsp`.
*   `zenc.server.verbose`: Start the language server with `--verbose`, so it logs what it does to the "Zen C Language Server" output. Default: `false`.
*   `zenc.trace.server`: Trace the messages between VS Code and the language server (`off`, `messages` or `verbose`). Default: `off`.
*   `zenc.server.enable`: Start the language server. When disabled, syntax highlighting and editing support remain. Default: `true`.

## Commands

*   **Zen C: Restart Language Server**: restarts the language server, e.g. after rebuilding it. It also restarts by itself when `zenc.serverPath`, `zenc.server.verbose` or `zenc.server.enable` changes.
*   **Zen C: Show Language Server Output**: opens the language server's output, where its logs and traces go.

## Publishing

To publish a new version:

1.  Update version in `package.json`.
2.  Install `vsce`: `npm install -g vsce`
3.  Package: `vsce package`
4.  Publish: `vsce publish`

## License

MIT
