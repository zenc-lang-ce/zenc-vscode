import * as assert from 'assert';
import { findTestBlocks } from '../testBlocks';

const source = [
    'fn add(a: int, b: int) -> int { return a + b; }',
    '',
    'test "adds" {',
    '}',
    '    test   "indented \\"quoted\\" name" {',
    '// test "commented out" {',
    'let test = "not a test";',
    'test "second on\\\\" { }',
].join('\r\n');

assert.deepStrictEqual(findTestBlocks(source), [
    { name: 'adds', line: 2 },
    { name: 'indented \\"quoted\\" name', line: 4 },
    { name: 'second on\\\\', line: 7 },
]);
assert.deepStrictEqual(findTestBlocks(''), []);

console.log('testBlocks.test: all cases passed');
