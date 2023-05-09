const fs = require('fs');
const path = require('path');
const DefinePlugin = require('webpack').DefinePlugin;
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");


const package = JSON.parse(fs.readFileSync('./package.json'));

module.exports = [
    {
        entry: './App.tsx',
        module: {
            rules: [
                {
                    test: /\.css$/,
                    use: [MiniCssExtractPlugin.loader, "css-loader"],
                },
                {
                    test: /\.tsx?$/,
                    use: {
                        loader: "babel-loader",
                        options: {
                            presets: [
                                "@babel/preset-typescript",
                                "@babel/preset-react"
                            ]
                        }
                    },
                    exclude: /node_modules/,
                },
            ],
        },
        resolve: { extensions: ['.tsx', '.ts', '.js'] },
        output: {
            path: path.resolve(__dirname, './dist'),
            filename: 'app.js',
        },
        plugins: [
            new HtmlWebpackPlugin({ title: "Pixel Picker", favicon: './favicon.ico' }),
            new MiniCssExtractPlugin(),
            new DefinePlugin({ __VERSION__: JSON.stringify('v' + package.version) }),
        ],
    },
];