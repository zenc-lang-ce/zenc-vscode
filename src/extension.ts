import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    Executable
} from 'vscode-languageclient/node';
import { resolveServerCommand } from './server';

// Prefix of the settings and commands, and the client id (which names `<id>.trace.server`).
// It is not `zenc`, which another Zen C extension uses: each one evolves on its own.
const SECTION = 'zenc-lang-ce';

let client: LanguageClient | undefined;
// Shared by every client, so that a restart does not add another output.
let outputChannel: vscode.OutputChannel | undefined;

// Settings are read here, so a new client picks up the current ones.
function createClient(): LanguageClient | undefined {
    const config = vscode.workspace.getConfiguration(SECTION);
    // Without the server, highlighting and editing support still work.
    if (!config.get<boolean>('server.enable', true)) {
        return undefined;
    }
    const serverPath = config.get<string | null>('serverPath');
    const server = resolveServerCommand(serverPath);
    if (!server) {
        void askForServerPath('Zen C: the language server (zc-lsp) is not in PATH.');
        return undefined;
    }
    if (path.isAbsolute(server.command) && !fs.existsSync(server.command)) {
        void askForServerPath(`Zen C: the language server set in ${SECTION}.serverPath does not exist: ${server.command}`);
        return undefined;
    }

    const args = [...server.args];
    // The server logs to stderr, which ends up in the client's output.
    if (config.get<boolean>('server.verbose')) {
        args.push('--verbose');
    }

    const run: Executable = {
        command: server.command,
        args,
        options: {
            env: process.env
        }
    };

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
        run,
        debug: run
    };

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        // Register the server for Zen C documents
        documentSelector: [{ scheme: 'file', language: 'zenc' }],
        outputChannel
    };

    // Which server runs, in the output where its own messages go.
    outputChannel?.appendLine(`Starting ${[run.command, ...(run.args ?? [])].join(' ')}`);

    return new LanguageClient(
        SECTION,
        'Zen C Language Server',
        serverOptions,
        clientOptions
    );
}

// The language server does not come with the extension, so it can be anywhere: ask where.
async function askForServerPath(problem: string): Promise<void> {
    const select = 'Select zc-lsp…';
    const settings = 'Open Settings';
    const choice = await vscode.window.showWarningMessage(problem, select, settings);
    if (choice === settings) {
        await vscode.commands.executeCommand('workbench.action.openSettings', `${SECTION}.serverPath`);
        return;
    }
    if (choice !== select) {
        return;
    }
    const picked = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: 'Use as Zen C language server',
        title: 'Select zc-lsp, or the zc compiler next to it'
    });
    if (!picked || picked.length === 0) {
        return;
    }
    // Where the setting is: a workspace value would hide a new user one.
    const config = vscode.workspace.getConfiguration(SECTION);
    const inspected = config.inspect<string | null>('serverPath');
    const target =
        inspected?.workspaceValue !== undefined
            ? vscode.ConfigurationTarget.Workspace
            : vscode.ConfigurationTarget.Global;
    // The configuration change restarts the server.
    await config.update('serverPath', picked[0].fsPath, target);
}

async function restartServer(): Promise<void> {
    if (client) {
        try {
            await client.stop();
        } catch {
            // A server that failed to start cannot be stopped; replace it anyway.
        }
    }
    client = createClient();
    await client?.start();
}

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('Zen C Language Server');
    context.subscriptions.push(
        outputChannel,
        vscode.commands.registerCommand(`${SECTION}.restartServer`, restartServer),
        vscode.commands.registerCommand(`${SECTION}.showServerOutput`, () => {
            client?.outputChannel.show(true);
        }),
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (
                event.affectsConfiguration(`${SECTION}.serverPath`) ||
                event.affectsConfiguration(`${SECTION}.server.verbose`) ||
                event.affectsConfiguration(`${SECTION}.server.enable`)
            ) {
                void restartServer();
            }
        })
    );

    // Start the client. This will also launch the server
    client = createClient();
    client?.start();
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
