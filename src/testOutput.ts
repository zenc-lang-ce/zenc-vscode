import { TestBlock } from './testBlocks';

/** A failed `assert` or `expect`, as the test runner reports it. */
export interface TestFailure {
    /** The source file, as the compiler names it: relative to where it ran, or absolute. */
    file: string;
    /** One-based line of the assertion. */
    line: number;
    message: string;
}

/** What the test runner printed about one test. */
export interface TestResult {
    /** The name as printed, with its escapes already applied. */
    name: string;
    /** `unfinished` when the program stopped inside the test, as a crash does. */
    status: 'passed' | 'failed' | 'unfinished';
    failures: TestFailure[];
}

// The runner prints `  TEST: name ... `, then whatever the test prints, then `OK` or `FAIL`.
const TEST_HEADER = /^  TEST: (.*?) \.\.\. /gm;
const FAILURE = /^\s*(.+?):(\d+): (?:Assertion|Expectation) failed: (.*)$/gm;
// The line that closes the run, after the last test.
const SUMMARY = /^\d+ test\(s\) failed$/m;

/** The results in what the test runner wrote to stderr, in the order the tests ran. */
export function parseTestOutput(output: string): TestResult[] {
    const headers = [...output.matchAll(TEST_HEADER)];
    return headers.map((header, index) => {
        const start = (header.index ?? 0) + header[0].length;
        const end = index + 1 < headers.length ? headers[index + 1].index : output.length;
        const body = output.slice(start, end).split(SUMMARY)[0].trimEnd();
        const failures = [...body.matchAll(FAILURE)].map((failure) => ({
            file: failure[1],
            line: Number(failure[2]),
            message: failure[3],
        }));
        const status = body.endsWith('OK') ? 'passed' : body.endsWith('FAIL') ? 'failed' : 'unfinished';
        return { name: header[1], status, failures };
    });
}

/**
 * The result of each block, undefined for a block that did not run.
 * Tests run in source order, so with as many results as blocks they pair up by position,
 * which also tells apart tests with the same name. With fewer results (a test left out by
 * a build condition, or a crash that stopped the run), each block takes the next result with its name.
 */
export function pairResultsWithBlocks(blocks: TestBlock[], results: TestResult[]): (TestResult | undefined)[] {
    if (blocks.length === results.length) {
        return results;
    }
    let next = 0;
    return blocks.map((block) => {
        const printedName = block.name.replace(/\\(.)/g, '$1');
        const found = results.findIndex((result, index) => index >= next && result.name === printedName);
        if (found < 0) {
            return undefined;
        }
        next = found + 1;
        return results[found];
    });
}
