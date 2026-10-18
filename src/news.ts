import Parser from "rss-parser";

export interface NewsItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  published: Date;
}

const FEEDS = [
  { source: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/football/rss.xml" },
  { source: "Sky Sports", url: "https://www.skysports.com/rss/12040" },
  { source: "The Guardian", url: "https://www.theguardian.com/football/rss" },
  { source: "ESPN", url: "https://www.espn.com/espn/rss/soccer/news" },
];

const parser = new Parser({ timeout: 10_000 });

const DAY_MS = 24 * 60 * 60 * 1000;

export async function fetchRecentNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    FEEDS.map(async ({ source, url }) => {
      const feed = await parser.parseURL(url);
      return feed.items.flatMap((item): NewsItem[] => {
        if (!item.title || !item.link) return [];
        const published = new Date(item.isoDate ?? item.pubDate ?? "");
        if (Number.isNaN(published.getTime())) return [];
        return [
          {
            title: item.title.trim(),
            summary: (item.contentSnippet ?? "").trim().slice(0, 400),
            url: item.link,
            source,
            published,
          },
        ];
      });
    }),
  );

  const all: NewsItem[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") all.push(...r.value);
    else console.warn(`Feed failed (${FEEDS[i].source}):`, r.reason?.message ?? r.reason);
  });

  // Last 24 hours; widen to 48 if the day is quiet.
  const now = Date.now();
  let recent = all.filter((n) => now - n.published.getTime() <= DAY_MS);
  if (recent.length < 8) recent = all.filter((n) => now - n.published.getTime() <= 2 * DAY_MS);

  recent.sort((a, b) => b.published.getTime() - a.published.getTime());
  return recent.slice(0, 40);
}
