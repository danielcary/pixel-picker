const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = [{
    entry: './App.tsx',
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"],
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
    plugins: [new HtmlWebpackPlugin({title: "Pixel Picker"})],
},

];