const path = require('path');

const config = {
    mode: 'none',
    module: {
        rules: [
            {
                test: /\.m?js$/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            [
                                '@babel/env',
                                {
                                    "targets": "last 2 Chrome versions, last 2 Firefox versions"
                                }
                            ]
                        ],
                        plugins: ['@babel/plugin-proposal-class-properties']
                    }
                }
            }
        ]
    }
};

const background_config = {
    entry: './extension/components/background/background.js',
    output: {
        filename: 'background.js',
        path: path.resolve(__dirname, './dist/components/background')
    },
    ...config
};

const browser_action_config = {
    entry: './extension/components/browser_action/browser_action.js',
    output: {
        filename: 'browser_action.js',
        path: path.resolve(__dirname, './dist/components/browser_action')
    },
    ...config
};

module.exports = [
    background_config,
    browser_action_config
];
