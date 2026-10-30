import type { FileItem } from "../types";
import type { TabId, TreeTabId } from "../data/tabs";
import { TAB_LABELS } from "../data/tabs";

export interface SearchEntry {
  item: FileItem;
  /** Display trail, e.g. ["Study Assets", "Physics", "Motion in One Dimension"] */
  breadcrumb: string[];
  tabId: TabId;
  /** folder chain from the tab's root down to (not including) this item — used to
   *  seed the explorer's breadcrumb path when a folder result is opened */
  ancestors: FileItem[];
}

function collectEntries(items: FileItem[], ancestors: FileItem[], tabId: TabId, tabLabel: string, out: SearchEntry[]) {
  for (const item of items) {
    out.push({
      item,
      breadcrumb: [tabLabel, ...ancestors.map((a) => a.name)],
      tabId,
      ancestors,
    });
    if (item.type === "folder") {
      collectEntries(item.children ?? [], [...ancestors, item], tabId, tabLabel, out);
    }
  }
}

/** Walks every tab's tree once, building a flat searchable index of every file and folder. */
export function buildSearchIndex(trees: Record<TreeTabId, FileItem[]>): SearchEntry[] {
  const out: SearchEntry[] = [];
  (Object.keys(trees) as TreeTabId[]).forEach((tabId) => {
    collectEntries(trees[tabId], [], tabId, TAB_LABELS[tabId], out);
  });
  return out;
}

/**
 * Splits a query into whitespace-separated terms, expanding any term that
 * matches a synonyms.txt key into an OR-group of [term, ...synonyms].
 * A term with no synonym entry is its own single-item OR-group.
 */
export function buildTermGroups(query: string, synonyms: Record<string, string[]>): string[][] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return terms.map((term) => {
    const syns = synonyms[term];
    return syns && syns.length > [0] ? [term, ...syns] : [term];
  });
}

/**
 * Parses raw text from exceptions.txt into a record of query -> array of lowercased exception strings.
 * Format: query = exception1, exception2
 */
export function parseExceptionsFile(rawText: string): Record<string, string[]> {
  const exceptionsMap: Record<string, string[]> = {};
  const lines = rawText.split("\n");
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue; // Skip comments and empty lines
    
    const parts = trimmed.split("=");
    if (parts.length === 2) {
      const queryKey = parts[0].trim().toLowerCase();
      const exceptionValues = parts[1]
        .split(",")
        .map((ex) => ex.trim().toLowerCase())
        .filter(Boolean);
      
      exceptionsMap[queryKey] = exceptionValues;
    }
  }
  
  return exceptionsMap;
}

/** 
 * A file/folder matches when its FULL PATH contains at least one phrase 
 * from EVERY term group (with negative lookbehind for preceding letters),
 * AND none of the query-specific exceptions appear in the path.
 */
export function matchesTermGroups(
  entry: SearchEntry, 
  termGroups: string[][], 
  rawQuery: string = "", 
  exceptions: Record<string, string[]> = {}
): boolean {
  const fullPathParts = [...entry.breadcrumb, entry.item.name];
  const lowerFullPath = fullPathParts.join(" / ").toLowerCase();

  const cleanQuery = rawQuery.trim().toLowerCase();
  const queryTerms = cleanQuery.split(/\s+/).filter(Boolean);

  // 1. Check query-specific exceptions based on terms or full query
  for (const term of queryTerms) {
    const forbiddenList = exceptions[term];
    if (forbiddenList && forbiddenList.length > 0) {
      const hasException = forbiddenList.some((forbiddenWord) => {
        const escapedForbidden = forbiddenWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const exceptionRegex = new RegExp(`(?<![a-z])${escapedForbidden}(?![a-z])`, 'i');
        return exceptionRegex.test(lowerFullPath);
      });
      if (hasException) return false;
    }
  }

  const fullQueryForbidden = exceptions[cleanQuery];
  if (fullQueryForbidden && fullQueryForbidden.length > 0) {
    const hasFullException = fullQueryForbidden.some((forbiddenWord) => {
      const escapedForbidden = forbiddenWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const exceptionRegex = new RegExp(`(?<![a-z])${escapedForbidden}(?![a-z])`, 'i');
      return exceptionRegex.test(lowerFullPath);
    });
    if (hasFullException) return false;
  }

  // 2. Standard term group matching with negative lookbehind for preceding letters
  return termGroups.every((group) => 
    group.some((phrase) => {
      const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<![a-z])${escapedPhrase}`, 'i');
      return regex.test(lowerFullPath);
    })
  );
}
