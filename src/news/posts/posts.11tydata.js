export default {
  layout: "layouts/post.njk",
  category: "news",
  permalink: (data) => `/news/${data.page.fileSlug}/`,
};
