import { describe, expect, it } from "vitest";
import { combineAndPaginate, type SearchResult } from "../../src/modules/search/search.pure.js";

const article = (id: string): SearchResult => ({ type: "article", id, slug: `article-${id}`, title: `Article ${id}` });
const author = (id: string): SearchResult => ({ type: "author", id, slug: `author-${id}`, title: `Author ${id}` });

describe("search: combineAndPaginate", () => {
  it("returns the documented lightweight shape untouched", () => {
    const { data } = combineAndPaginate([article("1")], [], 1, 20);
    expect(data).toEqual([{ type: "article", id: "1", slug: "article-1", title: "Article 1" }]);
  });

  it("orders articles before authors in the combined list", () => {
    const { data } = combineAndPaginate([article("a")], [author("b")], 1, 20);
    expect(data.map((r) => r.type)).toEqual(["article", "author"]);
  });

  it("paginates across the combined set, not per type", () => {
    const articles = [article("1"), article("2")];
    const authors = [author("3"), author("4")];
    const page1 = combineAndPaginate(articles, authors, 1, 3);
    expect(page1.data.map((r) => r.id)).toEqual(["1", "2", "3"]);
    expect(page1.pagination).toEqual({ page: 1, limit: 3, total: 4, totalPages: 2 });

    const page2 = combineAndPaginate(articles, authors, 2, 3);
    expect(page2.data.map((r) => r.id)).toEqual(["4"]);
  });

  it("returns an empty page with totalPages 1 when there are no results", () => {
    const { data, pagination } = combineAndPaginate([], [], 1, 20);
    expect(data).toEqual([]);
    expect(pagination).toEqual({ page: 1, limit: 20, total: 0, totalPages: 1 });
  });
});
