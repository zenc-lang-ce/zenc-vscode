import * as vscode from 'vscode';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    Executable
} from 'vscode-languageclient/node';
import { resolveServerCommand } from './server';

let client: LanguageClient | undefined;
// Shared by every client, so that a restart does not add another output.
let outputChannel: vscode.OutputChannel | undefined;

// Settings are read here, so a new client picks up the current ones.
function createClient(): LanguageClient | undefined {
    const config = vscode.workspace.getConfiguration('zenc');
    // Without the server, highlighting and editing support still work.
    if (!config.get<boolean>('server.enable', true)) {
        return undefined;
    }
    const server = resolveServerCommand(config.get<string | null>('serverPath'));
    if (!server) {
        vscode.window.showErrorMessage(
            'Zen C: language server not found. Install zc-lsp, which comes with the Zen C compiler, or set "zenc.serverPath".'
        );
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
        'zenc',
        'Zen C Language Server',
        serverOptions,
        clientOptions
    );
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
        vscode.commands.registerCommand('zenc.restartServer', restartServer),
        vscode.commands.registerCommand('zenc.showServerOutput', () => {
            client?.outputChannel.show(true);
        }),
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (
                event.affectsConfiguration('zenc.serverPath') ||
                event.affectsConfiguration('zenc.server.verbose') ||
                event.affectsConfiguration('zenc.server.enable')
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
