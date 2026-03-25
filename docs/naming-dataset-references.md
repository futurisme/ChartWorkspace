# Naming dataset references (for generative NPC/company naming)

Used as reference direction for building larger, natural naming pools:

1. U.S. Social Security baby names (first-name frequency, long-tail variety):
   - https://www.ssa.gov/oact/babynames/
2. U.S. Census surname data (common family-name distributions):
   - https://www.census.gov/topics/population/genealogy/data/2010_surnames.html
3. SEC EDGAR company filings index (broad real-world company naming patterns):
   - https://www.sec.gov/edgar/search/

Notes:
- In-code dataset is curated/manual and intentionally simplified for readability in UI.
- Word-level uniqueness constraints are applied in game logic to avoid repeated name fragments.
