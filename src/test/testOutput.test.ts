import * as assert from 'assert';
import { pairResultsWithBlocks, parseTestOutput } from '../testOutput';

// What `zc run` writes to stderr for a file with a passing and a failing test.
const output = [
    '   Compiling sample.zc...',
    '  TEST: adds ... OK',
    '  TEST: fails "twice" ...   sample.zc:8: Assertion failed: bad sum',
    'printed by the test',
    '  /src/other.zc:12: Expectation failed: a: b',
    'FAIL',
    '',
    '1 test(s) failed',
    '',
].join('\n');

const passed = { name: 'adds', status: 'passed', failures: [] };
const failed = {
    name: 'fails "twice"',
    status: 'failed',
    failures: [
        { file: 'sample.zc', line: 8, message: 'bad sum' },
        { file: '/src/other.zc', line: 12, message: 'a: b' },
    ],
};
assert.deepStrictEqual(parseTestOutput(output), [passed, failed]);

// A compile error runs no test.
assert.deepStrictEqual(parseTestOutput('sample.zc:3:5: error: unknown type\n'), []);

// A crash stops the program inside a test, after its failed assertions.
assert.deepStrictEqual(parseTestOutput('  TEST: adds ... OK\n  TEST: crashes ...   a.zc:4: Assertion failed: x\n'), [
    passed,
    { name: 'crashes', status: 'unfinished', failures: [{ file: 'a.zc', line: 4, message: 'x' }] },
]);

const results = parseTestOutput(output);
const adds = { name: 'adds', line: 0 };
const fails = { name: 'fails \\"twice\\"', line: 4 };
// As many results as blocks: by position, whatever the names.
assert.deepStrictEqual(pairResultsWithBlocks([{ name: 'renamed', line: 0 }, fails], results), results);
// Fewer results: by name, and a block that did not run has none.
assert.deepStrictEqual(pairResultsWithBlocks([{ name: 'left out', line: 0 }, adds, fails], results), [
    undefined,
    results[0],
    results[1],
]);
assert.deepStrictEqual(pairResultsWithBlocks([adds, adds, fails], results), [results[0], undefined, results[1]]);

console.log('testOutput.test: all cases passed');
