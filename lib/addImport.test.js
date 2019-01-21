const addImports = require('./addImports');

describe('addImports', () => {
  it('all lost', () => {
    expect(
      addImports(
        `
readFileSync('a');
join('a');
    `.trimLeft(),
        {
          fs: ['readFileSync'],
          path: ['join', 'dirname'],
        },
      ),
    ).toEqual(
      `
import { readFileSync } from 'fs';
import { join } from 'path';
readFileSync('a');
join('a');
    `.trimLeft(),
    );
  });

  it('partial lost', () => {
    expect(
      addImports(
        `
import { join } from 'path';

readFileSync('a');
join('a');
    `.trimLeft(),
        {
          fs: ['readFileSync'],
          path: ['join', 'dirname'],
        },
      ),
    ).toEqual(
      `
import { join } from 'path';
import { readFileSync } from 'fs';

readFileSync('a');
join('a');
    `.trimLeft(),
    );
  });

  it('partial lost', () => {
    expect(
      addImports(
        `
import { join } from 'path';
import { readFileSync } from 'fs';

join('a', 'b');
readFileSync('xxx');
    `.trimLeft(),
        {
          fs: ['readFileSync'],
          path: ['join', 'dirname'],
        },
      ),
    ).toEqual(
      `
import { join } from 'path';
import { readFileSync } from 'fs';

join('a', 'b');
readFileSync('xxx');
    `.trimLeft(),
    );
  });

  it('with default', () => {
    expect(
      addImports(
        `
import path from 'path';

readFileSync('a');
join('a');
    `.trimLeft(),
        {
          fs: ['readFileSync'],
          path: ['join', 'dirname'],
        },
      ),
    ).toEqual(
      `
import path, { join } from 'path';
import { readFileSync } from 'fs';

readFileSync('a');
join('a');
    `.trimLeft(),
    );
  });

  it('import default only', () => {
    expect(
      addImports(
        `
import childProcess from 'child_process';

path.join('a');
    `.trimLeft(),
        {
          fs: ['readFileSync'],
          path: ['join', 'dirname'],
        },
      ),
    ).toEqual(
      `
import childProcess from 'child_process';
import { join } from 'path';

path.join('a');
    `.trimLeft(),
    );
  });
});
