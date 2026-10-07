import { describe, expect, it } from 'vitest';

import { createSentenceSplitter, splitSentences } from '@/lib/tutor/voice/sentence-splitter';

describe('sentence splitter (voice-16)', () => {
  it('splits at sentence ends only once the following whitespace has arrived', () => {
    const splitter = createSentenceSplitter();
    expect(splitter.push('Two fourths is one half.')).toEqual([]);
    expect(splitter.push(' Picture a bar')).toEqual(['Two fourths is one half.']);
    expect(splitter.push(' cut into four pieces.')).toEqual([]);
    expect(splitter.flush()).toEqual(['Picture a bar cut into four pieces.']);
    expect(splitter.pending()).toBe('');
  });

  it('keeps decimals inside one sentence', () => {
    expect(splitSentences('Multiply by 2.5 to get 7.5. Then add 0.25 more.')).toEqual([
      'Multiply by 2.5 to get 7.5.',
      'Then add 0.25 more.',
    ]);
    const streamed = createSentenceSplitter();
    expect(streamed.push('The answer is 3.')).toEqual([]);
    expect(streamed.push('75 exactly.')).toEqual([]);
    expect(streamed.push(' Nice.')).toEqual(['The answer is 3.75 exactly.']);
  });

  it('does not end a sentence after an abbreviation or an initial', () => {
    expect(
      splitSentences('Dr. Lee wrote it down. Read e.g. the first line. J. K. agreed.'),
    ).toEqual(['Dr. Lee wrote it down.', 'Read e.g. the first line.', 'J. K. agreed.']);
  });

  it('keeps math like "2/3 + 1/6 = ?" whole and splits after the question mark', () => {
    expect(splitSentences('What is 2/3 + 1/6 = ? Try it on the board.')).toEqual([
      'What is 2/3 + 1/6 = ?',
      'Try it on the board.',
    ]);
    expect(splitSentences('So 1/2 = 2/4 = 3/6. They are all the same amount!')).toEqual([
      'So 1/2 = 2/4 = 3/6.',
      'They are all the same amount!',
    ]);
  });

  it('emits an early clause chunk past the soft limit so the first audio goes out fast', () => {
    const splitter = createSentenceSplitter({ softMaxChars: 40 });
    const out = splitter.push(
      'First we look at the denominator, which tells us how many equal pieces there are, and then the numerator.',
    );
    expect(out).toEqual([
      'First we look at the denominator,',
      'which tells us how many equal pieces there are,',
    ]);
    expect(splitter.flush()).toEqual(['and then the numerator.']);
  });

  it('treats ellipses and stacked punctuation as terminal and ignores empty deltas', () => {
    expect(splitSentences('Hmm... let me think. Really?! Yes.')).toEqual([
      'Hmm...',
      'let me think.',
      'Really?!',
      'Yes.',
    ]);
    const splitter = createSentenceSplitter();
    expect(splitter.push('')).toEqual([]);
    expect(splitter.flush()).toEqual([]);
  });
});
