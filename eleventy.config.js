export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.ignores.add("src/admin/**");
  eleventyConfig.addPassthroughCopy({ "src/assets/img/favicon.svg": "favicon.svg" });

  eleventyConfig.addCollection("posts", (api) =>
    api.getFilteredByGlob("src/news/posts/*.md").sort((a, b) => b.date - a.date)
  );

  eleventyConfig.addFilter("readableDate", (d) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
  );
  eleventyConfig.addFilter("isoDate", (d) => new Date(d).toISOString().slice(0, 10));
  eleventyConfig.addFilter("byCategory", (posts, cat) => posts.filter((p) => p.data.category === cat));
  eleventyConfig.addFilter("findBy", (arr, key, value) => (arr || []).find((item) => item[key] === value));
  eleventyConfig.addFilter("head", (arr, n) => (arr || []).slice(0, n));
  eleventyConfig.addFilter("usd", (n) => "US$" + Number(n).toLocaleString("en-US"));
  eleventyConfig.addFilter("sumFees", (rows) => rows.reduce((s, r) => s + Number(r.amount || 0), 0));

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    markdownTemplateEngine: false,
    htmlTemplateEngine: "njk",
  };
}
