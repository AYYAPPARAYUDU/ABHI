export interface KnowledgeSearchResult {
  chunk_id: string;
  source: string;
  text: string;
  score: number;
  tags: string[];
  citation: string;
}

export interface KnowledgeSearchResponse {
  query: string;
  total_results: number;
  results: KnowledgeSearchResult[];
}

export interface KnowledgeSourceSummary {
  source: string;
  chunk_count: number;
}

export interface KnowledgeSourcesResponse {
  sources: KnowledgeSourceSummary[];
  total_chunks: number;
  vector_dimension: number;
  table_name: string;
}

export interface KnowledgeChunkItem {
  chunk_id: string;
  source: string;
  text: string;
  tags: string[];
  created_at_ts: number;
}

export interface RetrievalContextItem {
  chunk_id: string;
  source: string;
  excerpt: string;
  score: number;
  citation: string;
}

export interface RetrievalContextResponse {
  query: string;
  retrieved_context: RetrievalContextItem[];
}
