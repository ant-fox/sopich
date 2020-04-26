const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    game: './src/iogame/client/index.js',
  },
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          'css-loader',
        ],
      },
    ],
  },
  plugins: [
      new MiniCssExtractPlugin({
          filename: '[name].[contenthash].css',
      }),
      new CopyPlugin([
          { from: 'src/wave-tables', to: 'wave-tables' },
      ]),
      new HtmlWebpackPlugin({
          filename: 'index.html',
          template: 'src/iogame/client/html/index.html',
          favicon: 'src/localgame/favicon.ico',
      }),
  ],
};
