import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { resolveCompilerCommand, resolveServerCommand } from '../server';

// A temporary directory holding empty files with the given executable names.
function binDirectory(...names: string[]): string {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'zenc-server-'));
    for (const name of names) {
        fs.writeFileSync(path.join(directory, name), '');
    }
    return directory;
}

const both = binDirectory('zc', 'zc-lsp');
const compilerOnly = binDirectory('zc');
const nothing = binDirectory();

// Empty setting: zc-lsp from PATH, else `zc lsp` from PATH, else nothing.
assert.deepStrictEqual(resolveServerCommand('', { PATH: both }), {
    command: path.join(both, 'zc-lsp'),
    args: [],
});
assert.deepStrictEqual(resolveServerCommand(undefined, { PATH: compilerOnly }), {
    command: path.join(compilerOnly, 'zc'),
    args: ['lsp'],
});
assert.strictEqual(resolveServerCommand(null, { PATH: nothing }), undefined);

// The compiler, as the setting meant before: the zc-lsp next to it, else `zc lsp`.
assert.deepStrictEqual(resolveServerCommand(path.join(both, 'zc'), { PATH: '' }), {
    command: path.join(both, 'zc-lsp'),
    args: [],
});
assert.deepStrictEqual(resolveServerCommand(path.join(compilerOnly, 'zc'), { PATH: '' }), {
    command: path.join(compilerOnly, 'zc'),
    args: ['lsp'],
});
assert.deepStrictEqual(resolveServerCommand('zc', { PATH: both }), {
    command: path.join(both, 'zc-lsp'),
    args: [],
});
assert.deepStrictEqual(resolveServerCommand('zc', { PATH: compilerOnly }), {
    command: 'zc',
    args: ['lsp'],
});

// The language server itself.
assert.deepStrictEqual(resolveServerCommand('/opt/zenc/bin/zc-lsp', { PATH: '' }), {
    command: '/opt/zenc/bin/zc-lsp',
    args: [],
});

// The compiler: the setting when it names it, the zc next to the server, else zc from PATH.
assert.strictEqual(resolveCompilerCommand('zc', { PATH: '' }), 'zc');
assert.strictEqual(resolveCompilerCommand(path.join(both, 'zc-lsp'), { PATH: '' }), path.join(both, 'zc'));
assert.strictEqual(
    resolveCompilerCommand('/opt/zenc/bin/zc-lsp', { PATH: compilerOnly }),
    path.join(compilerOnly, 'zc')
);
assert.strictEqual(resolveCompilerCommand('', { PATH: both }), path.join(both, 'zc'));
assert.strictEqual(resolveCompilerCommand(null, { PATH: nothing }), undefined);

console.log('server.test: all cases passed');
