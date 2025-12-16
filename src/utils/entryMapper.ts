import type { Entry, Comment, MediaContent } from '../types';

const toStringValue = (val: any, fallback = ''): string => {
  if (typeof val === 'string') return val;
  if (val === null || val === undefined) return fallback;
  return String(val);
};

const toStringArray = (val: any): string[] => {
  if (!Array.isArray(val)) return [];
  return val.map(v => toStringValue(v, '')).filter(Boolean);
};

const normalizeMedia = (media: any): MediaContent | null => {
  if (!media) return null;
  if (typeof media === 'string') {
    try {
      media = JSON.parse(media);
    } catch {
      return null;
    }
  }
  if (Array.isArray(media)) {
    const items = toStringArray(media);
    return items.length ? { type: 'image', items } : null;
  }
  if (typeof media === 'object') {
    const items = Array.isArray((media as any).items)
      ? toStringArray((media as any).items)
      : Array.isArray((media as any).urls)
        ? toStringArray((media as any).urls)
        : [];
    const type = (media as any).type === 'video' ? 'video' : 'image';
    return items.length ? { type, items } : null;
  }
  return null;
};

const normalizeComments = (comments: any): Comment[] => {
  if (!Array.isArray(comments)) return [];
  return comments.map((c: any): Comment => ({
    id: toStringValue(c?.id, ''),
    author: toStringValue(c?.author, ''),
    content: toStringValue(c?.content, ''),
    timestamp: toStringValue(c?.timestamp, new Date().toISOString()),
    likes: typeof c?.likes === 'number' ? c.likes : Number(c?.likes) || 0,
    likedBy: toStringArray(c?.likedBy),
    replyTo: c?.replyTo !== undefined && c?.replyTo !== null ? toStringValue(c?.replyTo, '') : null,
    replies: normalizeComments(c?.replies || [])
  }));
};

export const mapEntryData = (e: any): Entry => ({
  id: toStringValue(e?.id, ''),
  title: toStringValue(e?.title, ''),
  author: toStringValue(e?.author, ''),
  timestamp: toStringValue(e?.timestamp, new Date().toISOString()),
  visibility: e?.visibility === 'private' ? 'private' : 'public',
  domain: toStringValue(e?.domain, ''),
  major: toStringValue(e?.major, ''),
  wasteType: e?.wasteType === 'recyclable' ? 'recyclable' : 'unrecyclable',
  wasteSubType: toStringValue(e?.wasteSubType, ''),
  cause: toStringValue(e?.cause, ''),
  content: toStringValue(e?.content, ''),
  media: normalizeMedia(e?.media),
  sympathy: typeof e?.sympathy === 'number' ? e.sympathy : Number(e?.sympathy) || 0,
  likedBy: toStringArray(e?.likedBy),
  tags: toStringArray(e?.tags),
  views: typeof e?.views === 'number' ? e.views : Number(e?.views) || 0,
  comments: normalizeComments(e?.comments)
});

export const entryMapper = {
  mapEntryData
};
