/* cspell:disable */

import { AiSearchSaveState } from './ai-search.models';

export function encodeAiSearchState(userQuery: string, maxItems: number): string {
  return encodeBase64Json({
    route: 'ai-search',
    searchMode: 'alfdockia-ai',
    alfdockiaAiSearch: true,
    userQuery,
    maxItems
  });
}

export function decodeAiSearchState(encodedQuery: string): AiSearchSaveState | null {
  if (!encodedQuery) {
    return null;
  }

  try {
    const decodedQuery = JSON.parse(decodeBase64(encodedQuery));

    if (decodedQuery?.route !== 'ai-search' && decodedQuery?.searchMode !== 'alfdockia-ai' && decodedQuery?.alfdockiaAiSearch !== true) {
      return null;
    }

    return {
      route: 'ai-search',
      searchMode: 'alfdockia-ai',
      alfdockiaAiSearch: true,
      userQuery: String(decodedQuery.userQuery || decodedQuery.query || ''),
      maxItems: Number(decodedQuery.maxItems || 25)
    };
  } catch {
    return null;
  }
}

function encodeBase64Json(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeBase64(value: string): string {
  return new TextDecoder().decode(Uint8Array.from(atob(value), (character) => character.charCodeAt(0)));
}
