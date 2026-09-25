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
    return syns && syns.length > 0 ? [term, ...syns] : [term];
  });
}

/** A name matches when it contains at least one phrase from EVERY term group (AND across terms, OR within a group). */
export function matchesTermGroups(name: string, termGroups: string[][]): boolean {
  const lowerName = name.toLowerCase();
  return termGroups.every((group) => group.some((phrase) => lowerName.includes(phrase)));
}
