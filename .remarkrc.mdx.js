const { remarklint } = require('@lobehub/lint');

module.exports = {
  ...remarklint,
  plugins: ['remark-mdx', ...remarklint.plugins, ['remark-lint-file-extension', false]],
};
