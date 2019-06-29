var webpack = require('webpack');
path = require('path');

module.exports = {
    mode: 'none',
    entry: {
        './_adapter/dist/adapter': ['./_adapter/src/entry'],

        './demo0/javascript/dist/demo-dev': ['./demo0/javascript/src/entry'],
        './demo/javascript/dist/demo-dev': ['./demo/javascript/src/entry'],

        './webrtc/dist/EMedia_sdk-dev': ['./webrtc/src/entry'],
        './pannel/dist/pannel': ['./pannel/src/entry']
    },
    output: {
        path: __dirname,
        publicPath: __dirname,
        filename: '[name].js',
        library: "easemob-emedia",
        //libraryExport: "emedialib",
        libraryTarget: "umd"
    },
    // devtool: '#eval-cheap-module-source-map',
    resolve: {
        extensions: ['.js', '.jsx', '.ts']
    },
    module: {
        noParse: [/adapter.js$/],
        rules: [
            {
                test: /\.scss$/,
                use: [
                    { loader: 'style-loader!css-loader!sass-loader' },
                ]
            },
            {
                test: require.resolve('zepto'),
                loader: 'exports-loader?window.Zepto!script-loader'
            },
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader?compact=false',
            }
        ]
    },
    plugins: [
        new webpack.ProvidePlugin({
            jQuery: "jquery",
            $: "jquery",
            zepto: 'zepto'
        })
    ],

    //压缩js
    optimization: {
        //minimize: true,
        // runtimeChunk: true,
        // splitChunks: {
        //     chunks: "async",
        //     minSize: 1000,
        //     minChunks: 2,
        //     maxAsyncRequests: 5,
        //     maxInitialRequests: 3,
        //     name: true,
        //     cacheGroups: {
        //         default: {
        //             minChunks: 1,
        //             priority: -20,
        //             reuseExistingChunk: true,
        //         },
        //         vendors: {
        //             test: /[\\/]node_modules[\\/]/,
        //             priority: -10
        //         }
        //     }
        // }
    }
}
;

