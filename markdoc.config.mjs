import { component, defineMarkdocConfig } from '@astrojs/markdoc/config';

export default defineMarkdocConfig({
  tags: {
    'article-image': {
      render: component('./src/blocks/article-image/ArticleImage.astro'),
      attributes: {
        mediaId: { type: String, required: true },
      },
    },
    'article-section': {
      render: component('./src/blocks/article-section/ArticleSection.astro'),
      attributes: {
        mediaId: { type: String },
        decoration: { type: String },
        side: { type: String, matches: ['left', 'right'], required: true },
      },
    },
  },
});
