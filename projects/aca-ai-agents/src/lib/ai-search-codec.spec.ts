/* cspell:disable */

import { decodeAiSearchState, encodeAiSearchState } from './ai-search-codec';

describe('AiSearchCodec', () => {
  it('encodes and decodes AlfDockia IA saved search state', () => {
    const encodedState = encodeAiSearchState('contratos firmados en 2026', 25);

    expect(decodeAiSearchState(encodedState)).toEqual({
      route: 'ai-search',
      searchMode: 'alfdockia-ai',
      alfdockiaAiSearch: true,
      userQuery: 'contratos firmados en 2026',
      maxItems: 25
    });
  });

  it('returns null for non IA saved search state', () => {
    const encodedState = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify({ userQuery: 'regular search' }))));

    expect(decodeAiSearchState(encodedState)).toBeNull();
  });

  it('returns null for malformed values', () => {
    expect(decodeAiSearchState('not-base64')).toBeNull();
  });
});
