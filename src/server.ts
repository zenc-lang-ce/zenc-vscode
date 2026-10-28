import * as fs from 'fs';
import * as path from 'path';

/** A command line that starts the Zen C language server. */
export interface ServerCommand {
    command: string;
    args: string[];
}

const EXECUTABLE_SUFFIX = process.platform === 'win32' ? '.exe' : '';

function isFile(file: string): boolean {
    try {
        return fs.statSync(file).isFile();
    } catch {
        return false;
    }
}

// Where the shell would find `name` through PATH.
function findInPath(name: string, env: NodeJS.ProcessEnv): string | undefined {
    const pathVariable = env.PATH ?? env.Path ?? '';
    for (const directory of pathVariable.split(path.delimiter)) {
        if (!directory) {
            continue;
        }
        const candidate = path.join(directory, name + EXECUTABLE_SUFFIX);
        if (isFile(candidate)) {
            return candidate;
        }
    }
    return undefined;
}

// The compiler, which the setting used to point at, rather than the language server.
function isCompiler(executable: string): boolean {
    const name = path.basename(executable).toLowerCase();
    return name === 'zc' || name === 'zc.exe';
}

/**
 * How to start the language server, given the `zenc.serverPath` setting:
 * - empty: `zc-lsp` from PATH, or `zc lsp` with a compiler that predates zc-lsp;
 * - the compiler (`zc`), as the setting meant before: the `zc-lsp` next to it, or `zc lsp`;
 * - anything else: that executable, which is the language server itself.
 * Returns undefined when nothing is found.
 */
export function resolveServerCommand(
    serverPath: string | null | undefined,
    env: NodeJS.ProcessEnv = process.env
): ServerCommand | undefined {
    const configured = (serverPath ?? '').trim();
    if (!configured) {
        const server = findInPath('zc-lsp', env);
        if (server) {
            return { command: server, args: [] };
        }
        const compiler = findInPath('zc', env);
        return compiler ? { command: compiler, args: ['lsp'] } : undefined;
    }

    if (isCompiler(configured)) {
        const isBareName = path.basename(configured) === configured;
        const sibling = path.join(path.dirname(configured), 'zc-lsp' + EXECUTABLE_SUFFIX);
        const server = isBareName ? findInPath('zc-lsp', env) : isFile(sibling) ? sibling : undefined;
        return server ? { command: server, args: [] } : { command: configured, args: ['lsp'] };
    }

    return { command: configured, args: [] };
}
