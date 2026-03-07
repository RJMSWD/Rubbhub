import { describe, expect, it } from 'vitest';
import { getNextProfileFormState } from '../src/utils/profileForm';

describe('getNextProfileFormState', () => {
  it('hydrates blank form state when async user data arrives', () => {
    const result = getNextProfileFormState(
      { title: '', bio: '' },
      null,
      { id: 'u1', title: '研究员', bio: '已有简介' }
    );

    expect(result).toEqual({
      formData: { title: '研究员', bio: '已有简介' },
      hydratedUserId: 'u1',
    });
  });

  it('does not overwrite edits once the same user has already been hydrated', () => {
    const result = getNextProfileFormState(
      { title: '本地修改', bio: '草稿' },
      'u1',
      { id: 'u1', title: '研究员', bio: '已有简介' }
    );

    expect(result).toEqual({
      formData: { title: '本地修改', bio: '草稿' },
      hydratedUserId: 'u1',
    });
  });
});
