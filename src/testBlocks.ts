/** A `test "name" { … }` block of a Zen C source. */
export interface TestBlock {
    /** The name as written between the quotes, escapes included. */
    name: string;
    /** Zero-based line of the `test` keyword. */
    line: number;
}

// The name may hold escaped quotes: `test "a \"b\" c" {`.
const TEST_HEADER = /^\s*test\s+"((?:[^"\\]|\\.)*)"/;

/** The test blocks of a source, in the order they appear, which is the order they run in. */
export function findTestBlocks(source: string): TestBlock[] {
    const blocks: TestBlock[] = [];
    const lines = source.split(/\r?\n/);
    for (let line = 0; line < lines.length; line++) {
        const header = TEST_HEADER.exec(lines[line]);
        if (header) {
            blocks.push({ name: header[1], line });
        }
    }
    return blocks;
}
