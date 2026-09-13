/* cspell:disable */

export interface AiSearchRequestOptions {
  skipCount?: number;
  maxItems?: number;
  filters?: Record<string, unknown>;
  fastSearch?: boolean;
  rerankCandidates?: number;
  candidateTextChars?: number;
}

export interface AiSearchPayload {
  query: {
    language: 'alfdockia-ai';
    query: string;
  };
  paging: {
    skipCount: number;
    maxItems: number;
  };
  user: string;
  authorities: string[];
  isAdmin: boolean;
  permissions: {
    user: string;
    authorities: string[];
    isAdmin: boolean;
  };
  filters: Record<string, unknown>;
  rerankCandidates?: number;
  candidateTextChars?: number;
}

export interface AiSearchPagination {
  count: number;
  hasMoreItems: boolean;
  totalItems: number;
  skipCount: number;
  maxItems: number;
}

export interface AiSearchNodeEntry {
  entry: {
    id: string;
    name: string;
    nodeType?: string;
    isFolder?: boolean;
    isFile?: boolean;
    createdAt?: string;
    modifiedAt?: string;
    createdByUser?: AiSearchUserInfo;
    modifiedByUser?: AiSearchUserInfo;
    content?: {
      mimeType?: string;
      mimeTypeName?: string;
      sizeInBytes?: number | string;
    };
    path?: {
      name?: string;
      isComplete?: boolean;
      elements?: unknown[];
    };
    search?: {
      score?: number;
      type?: string;
      embeddingModel?: string;
      embeddingDimension?: number;
    };
    properties?: Record<string, unknown>;
    allowableOperations?: string[];
    [key: string]: unknown;
  };
}

export interface AiSearchUserInfo {
  id?: string;
  displayName?: string;
}

export interface AiSearchResponse {
  list: {
    pagination: AiSearchPagination;
    context?: {
      query?: {
        language?: string;
        userQuery?: string;
      };
    };
    entries: AiSearchNodeEntry[];
  };
}

export interface AiSearchSaveState {
  route: 'ai-search';
  searchMode: 'alfdockia-ai';
  alfdockiaAiSearch: true;
  userQuery: string;
  maxItems: number;
}

export interface AiSearchSaveDialogData {
  defaultName: string;
  existingNames: string[];
}

export interface AiSearchSaveDialogResult {
  name: string;
  description: string;
}
