const path = require('path');

config = {
    mode: 'production',
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
        filename: 'background_2.js',
        path: path.resolve(__dirname, './extension/components/background')
    },
    ...config
};

const browser_action_config = {
    entry: './extension/components/browser_action/browser_action.js',
    output: {
        filename: 'browser_action_2.js',
        path: path.resolve(__dirname, './extension/components/browser_action')
    },
    ...config
};

module.exports = [
    background_config,
    browser_action_config
];
