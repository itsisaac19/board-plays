const path = require('path');

module.exports = {
    entry: {
        'board': './src/board.js',
        'built': './src/index.js'
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist')
    },
    mode: 'development',
    watch: true,
}