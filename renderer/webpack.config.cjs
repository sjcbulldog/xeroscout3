const path = require('path');
const cssloader = require('css-loader');

module.exports = {
  mode: 'development',
  entry: './dist/apps/xeroapp.js',
  output: {
    path: path.resolve(__dirname, 'dist', 'renderer'),
    filename: 'xeroapp.bundle.js',
  },
  devtool: 'inline-source-map',
  target: 'web',
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'cssloader'],
      }
    ]
  }
};
