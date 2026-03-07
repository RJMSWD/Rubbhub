import { describe, expect, it } from 'vitest';
import { mergeFetchedEntryIntoFeed } from '../src/utils/entriesFeed';

describe('mergeFetchedEntryIntoFeed', () => {
  it('updates an existing entry in-place', () => {
    const current = [
      { id: 'A', title: 'old' },
      { id: 'B', title: 'keep' },
    ];

    expect(mergeFetchedEntryIntoFeed(current, { id: 'A', title: 'new' })).toEqual([
      { id: 'A', title: 'new' },
      { id: 'B', title: 'keep' },
    ]);
  });

  it('does not inject a detail-only entry into the shared feed', () => {
    const current = [{ id: 'A', title: 'old' }];

    expect(mergeFetchedEntryIntoFeed(current, { id: 'B', title: 'detail-only' })).toEqual(current);
  });
});
