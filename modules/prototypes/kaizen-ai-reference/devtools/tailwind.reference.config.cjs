// Reuses the snapshot's real tailwind.config.js; only the content globs differ.
const base = require('/Users/man/education-product-discovery/snapshots/Kaizen-AI/web/tailwind.config.js');
module.exports = {
  ...base,
  content: [
    '/Users/man/education-product-discovery/snapshots/Kaizen-AI/web/components/**/*.{js,jsx}',
    '/Users/man/education-product-discovery/snapshots/Kaizen-AI/web/app/dashboard/page.js',
    __dirname + '/../src/**/*.{js,jsx}',
  ],
};
