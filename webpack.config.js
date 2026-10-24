const fs = require('fs');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const root = __dirname;
const dist = path.resolve(root, 'dist');

class CopyStaticAssetsPlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tapPromise('CopyStaticAssetsPlugin', async (compilation) => {
      const outputPath = compilation.outputOptions.path;
      await fs.promises.copyFile(path.resolve(root, 'COPYING'), path.join(outputPath, 'COPYING'));
    });
  }
}

module.exports = {
  mode: 'production',
  entry: {
    app: [
      path.resolve(root, 'assets/legacy-entry.js'),
      path.resolve(root, 'assets/base.css')
    ]
  },
  output: {
    path: dist,
    filename: 'assets/[name].[contenthash:8].js',
    clean: true,
    publicPath: ''
  },
  module: {
    rules: [
      {
        test: /legacy-entry\.js$/,
        use: path.resolve(root, 'build/legacy-concat-loader.js')
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      }
    ]
  },
  optimization: {
    minimize: true,
    minimizer: ['...', new (require('css-minimizer-webpack-plugin'))()]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'assets/[name].[contenthash:8].css'
    }),
    new HtmlWebpackPlugin({
      templateContent: () => fs.readFileSync(path.resolve(root, 'index.html'), 'utf8')
        .replace(/^\s*<link[^>]+href="assets\/base\.css"[^>]*>\s*$/m, '')
        .replace(/^\s*<script src="assets\/(?:vendors\/[^"]+|consts\.js|functions\.js|events\.js|main\.js)"><\/script>\s*$/gm, ''),
      scriptLoading: 'defer',
      inject: 'body'
    }),
    new CopyStaticAssetsPlugin()
  ]
};
