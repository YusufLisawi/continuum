export interface Flashback {
  id: number;
  title: string;
  body: string;
  project: string | null;
  pinned: boolean;
  created_at: number;
  updated_at: number;
  tags: string[];
}

export interface FlashbackInput {
  title: string;
  body?: string;
  project?: string | null;
  pinned?: boolean;
  tags?: string[];
}

export interface SearchResult {
  id: number;
  title: string;
  snippet: string;
  score: number;
  tags: string[];
  project: string | null;
  created_at: number;
  pinned: boolean;
}

export interface SearchOptions {
  tag?: string;
  project?: string;
  limit?: number;
  full?: boolean;
}

export type LinkKind = "related" | "follows" | "contradicts" | "refines";

export interface Link {
  src_id: number;
  dst_id: number;
  kind: LinkKind;
  created_at: number;
}

export interface Config {
  injectLimit: number;
}

export const DEFAULT_CONFIG: Config = {
  injectLimit: 30,
};
