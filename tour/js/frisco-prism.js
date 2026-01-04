// Frisco language definition for Prism.js

Prism.languages.frisco = {
    'comment': {
        pattern: /#.*/,
        greedy: true
    },
    'string': {
        pattern: /"(?:\\.|[^\\"\r\n])*"/,
        greedy: true
    },
    'keyword': /\b(?:concept|entity|Concept|Entity)\b/,
    'property': /\b(?:description|attributes|essentials|type)\b/,
'builtin': /\b(?:println|print|readln|is_unbound|is_bound|is_atom|is_list|findall|setof|similar_attr)\b/,
'operator': {
        pattern: /:-|=~=|=/,

        greedy: true
    },
    'query': {
        pattern: /\?/,
        alias: 'keyword'
    },
    'entity-name': {
        pattern: /\b[A-Z][A-Z_]+\b(?=\s*:)/,
        alias: 'constant'
    },
    'concept-name': {
        pattern: /(?:concept|entity|Concept|Entity)\s+([A-Z][a-zA-Z]*)/,
        inside: {
            'keyword': /concept|entity|Concept|Entity/,
            'class-name': /[A-Z][a-zA-Z]*/
        }
    },
    'variable': {
        pattern: /\b[A-Z][a-zA-Z0-9_]*\b/,
        alias: 'variable'
    },
    'predicate': {
        pattern: /\b[a-z][a-zA-Z0-9_]*(?=\()/,
        alias: 'function'
    },
    'punctuation': /[{}[\]();,.:]/,
    'number': /\b0x[\da-f]+\b|\b\d+\.?\d*(?:e[+-]?\d+)?/i
};

// Add bash language for shell commands
Prism.languages.bash = Prism.languages.bash || {
    'comment': {
        pattern: /(^|[^"{\\$])#.*/,
        lookbehind: true
    },
    'string': [
        {
            pattern: /(["'])(?:\\[\s\S]|\$\([^)]+\)|\$(?!\()|`[^`]+`|(?!\1)[^\\])*\1/,
            greedy: true,
            inside: {
                'variable': /\$(?:\w+|\{[^}]+\})/
            }
        },
        {
            pattern: /\$'(?:[^'\\]|\\[\s\S])*'/,
            greedy: true
        }
    ],
    'variable': /\$(?:\w+|\{[^}]+\})/,
    'function': {
        pattern: /(^|[;\s|&]|[<>]\()(?:npm|node|npx|bash|sh|cd|ls|mkdir|cat|echo|git)(?=$|[)\s;|&])/,
        lookbehind: true
    },
    'keyword': {
        pattern: /(^|[;\s|&]|[<>]\()(?:if|then|else|elif|fi|for|while|until|do|done|case|esac|function|in)(?=$|[)\s;|&])/,
        lookbehind: true
    },
    'operator': /&&?|\|\|?|[<>]=?|[!]|=/,
    'punctuation': /[(){}[\];]/
};
