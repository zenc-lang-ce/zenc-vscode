import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { resolveCompilerCommand } from './server';
import { findTestBlocks } from './testBlocks';
import { parseTestOutput, pairResultsWithBlocks, TestResult } from './testOutput';

/** What a run of the compiler wrote, and how it ended. */
interface CompilerRun {
    stderr: string;
    /** Undefined when the compiler could not be started or was stopped. */
    exitCode: number | undefined;
}

function isZenC(document: vscode.TextDocument): boolean {
    return document.languageId === 'zenc' && document.uri.scheme === 'file';
}

/**
 * Lists the `test` blocks of the open Zen C files as VS Code tests, each with its run
 * button in the gutter, and runs them with `zc run`. `section` is the prefix of the settings.
 */
export function registerTestController(context: vscode.ExtensionContext, section: string): void {
    const controller = vscode.tests.createTestController(`${section}.tests`, 'Zen C');

    // One item per file with tests, whose children are its tests in source order.
    function listTestsOfFile(uri: vscode.Uri, source: string): vscode.TestItem[] {
        const blocks = findTestBlocks(source);
        if (blocks.length === 0) {
            controller.items.delete(uri.toString());
            return [];
        }
        let file = controller.items.get(uri.toString());
        if (!file) {
            file = controller.createTestItem(uri.toString(), path.basename(uri.fsPath), uri);
            controller.items.add(file);
        }
        const timesSeen = new Map<string, number>();
        const tests = blocks.map((block) => {
            // The name is the id, so a test keeps its last result when others move around it.
            const repeats = timesSeen.get(block.name) ?? 0;
            timesSeen.set(block.name, repeats + 1);
            const id = repeats === 0 ? block.name : `${block.name}#${repeats + 1}`;
            const test = controller.createTestItem(id, block.name, uri);
            test.range = new vscode.Range(block.line, 0, block.line, 0);
            return test;
        });
        file.children.replace(tests);
        return tests;
    }

    function listTestsOfDocument(document: vscode.TextDocument): void {
        if (isZenC(document)) {
            listTestsOfFile(document.uri, document.getText());
        }
    }

    function runCompiler(
        compiler: string,
        file: string,
        run: vscode.TestRun,
        token: vscode.CancellationToken
    ): Promise<CompilerRun> {
        return new Promise((resolve) => {
            const folder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(file));
            const child = spawn(compiler, ['run', file], {
                cwd: folder?.uri.fsPath ?? path.dirname(file),
            });
            const cancellation = token.onCancellationRequested(() => child.kill());
            let stderr = '';
            // The output of a test run is shown in a terminal, which needs CRLF.
            const show = (text: string) => run.appendOutput(text.replace(/\r?\n/g, '\r\n'));
            child.stdout.on('data', (data: Buffer) => show(data.toString()));
            child.stderr.on('data', (data: Buffer) => {
                stderr += data.toString();
                show(data.toString());
            });
            const finish = (exitCode: number | undefined, error?: Error) => {
                cancellation.dispose();
                resolve({ stderr: error ? `${stderr}${error.message}\n` : stderr, exitCode });
            };
            child.on('error', (error) => finish(undefined, error));
            child.on('close', (exitCode) => finish(exitCode ?? undefined));
        });
    }

    function reportResult(run: vscode.TestRun, test: vscode.TestItem, result: TestResult, directory: string): void {
        if (result.status === 'passed') {
            run.passed(test);
            return;
        }
        const messages = result.failures.map((failure) => {
            const message = new vscode.TestMessage(failure.message);
            message.location = new vscode.Location(
                vscode.Uri.file(path.resolve(directory, failure.file)),
                new vscode.Position(failure.line - 1, 0)
            );
            return message;
        });
        if (result.status === 'failed') {
            run.failed(test, messages);
        } else {
            run.errored(test, [...messages, new vscode.TestMessage('The program stopped inside this test.')]);
        }
    }

    // `zc run` runs every test of a file, so running one test reports them all.
    async function runTestsOfFile(
        file: vscode.TestItem,
        compiler: string | undefined,
        run: vscode.TestRun,
        token: vscode.CancellationToken
    ): Promise<void> {
        const uri = file.uri;
        if (!uri) {
            return;
        }
        // The compiler reads the file from disk.
        const document = vscode.workspace.textDocuments.find((open) => open.uri.toString() === uri.toString());
        if (document?.isDirty) {
            await document.save();
        }
        const source = document?.getText() ?? fs.readFileSync(uri.fsPath, 'utf8');
        const tests = listTestsOfFile(uri, source);
        if (!compiler) {
            const problem = `The zc compiler is not in PATH, nor next to the language server of ${section}.serverPath.`;
            tests.forEach((test) => run.errored(test, new vscode.TestMessage(problem)));
            return;
        }

        tests.forEach((test) => run.started(test));
        const compilerRun = await runCompiler(compiler, uri.fsPath, run, token);
        if (token.isCancellationRequested) {
            return;
        }
        const results = parseTestOutput(compilerRun.stderr);
        if (results.length === 0 && compilerRun.exitCode !== 0) {
            // Nothing ran: the file does not compile, or the compiler could not be started.
            const problem = new vscode.TestMessage(compilerRun.stderr.trim() || 'zc run failed.');
            tests.forEach((test) => run.errored(test, problem));
            return;
        }
        const folder = vscode.workspace.getWorkspaceFolder(uri);
        const directory = folder?.uri.fsPath ?? path.dirname(uri.fsPath);
        pairResultsWithBlocks(findTestBlocks(source), results).forEach((result, index) => {
            if (result) {
                reportResult(run, tests[index], result, directory);
            } else {
                run.skipped(tests[index]);
            }
        });
    }

    async function runTests(request: vscode.TestRunRequest, token: vscode.CancellationToken): Promise<void> {
        const files = new Set<vscode.TestItem>();
        if (request.include) {
            request.include.forEach((item) => files.add(item.parent ?? item));
        } else {
            controller.items.forEach((file) => files.add(file));
        }
        request.exclude?.forEach((item) => files.delete(item));

        const compiler = resolveCompilerCommand(
            vscode.workspace.getConfiguration(section).get<string | null>('serverPath')
        );
        const run = controller.createTestRun(request);
        for (const file of files) {
            if (token.isCancellationRequested) {
                break;
            }
            await runTestsOfFile(file, compiler, run, token);
        }
        run.end();
    }

    controller.createRunProfile('Run', vscode.TestRunProfileKind.Run, runTests, true);
    vscode.workspace.textDocuments.forEach(listTestsOfDocument);
    context.subscriptions.push(
        controller,
        vscode.workspace.onDidOpenTextDocument(listTestsOfDocument),
        vscode.workspace.onDidChangeTextDocument((event) => listTestsOfDocument(event.document)),
        vscode.workspace.onDidDeleteFiles((event) => {
            event.files.forEach((uri) => controller.items.delete(uri.toString()));
        })
    );
}
