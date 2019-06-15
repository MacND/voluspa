module.exports = {
  'env': {
      'commonjs': true,
      'es6': true,
      'node': true
  },
  'extends': 'eslint:recommended',
  'globals': {
      'Atomics': 'readonly',
      'SharedArrayBuffer': 'readonly',
      "__basedir": "readonly"
  },
  'parserOptions': {
      'ecmaVersion': 2018
  },
  'rules': {
    'indent': [
      'error',
      2
    ],
    'linebreak-style': [
      'error',
      'windows'
    ],
    'quotes': [
      'error',
      'single'
    ],
    'semi': [
      'error',
      'always'
    ],
    "no-console": [
      0
    ],
    "no-unused-vars": [
      0
    ]
  }
};