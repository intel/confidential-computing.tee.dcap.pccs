/* Copyright(c) 2026 Intel Corporation
   SPDX-License-Identifier: BSD-3-Clause */

import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import pluginChaiFriendly from 'eslint-plugin-chai-friendly';
import nodePlugin from 'eslint-plugin-n';

export default defineConfig([
    globalIgnores(['*.config.js']),
    pluginChaiFriendly.configs.recommendedFlat, //replaces no-unused-expressions
    eslint.configs.recommended,
    {
        plugins: { n: nodePlugin },
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.mocha,
            }
        },
        rules: {

            // Possible Errors
            // These rules relate to possible syntax or logic errors in JavaScript code:
            'for-direction'               : 'error',
            'getter-return'               : 'error',
            'no-await-in-loop'            : 'error',
            'no-compare-neg-zero'         : 'error',
            'no-cond-assign'              : [ 'error', 'always' ],  // disallow assignment operators in conditional expressions
            'no-console'                  : 'warn',    // disallow the use of console
            'no-constant-condition'       : [ 'error', { 'checkLoops': true } ],   // disallow constant expressions in conditions
            'no-control-regex'            : 'error',   // disallow control characters in regular expressions
            'no-debugger'                 : 'error',   // disallow the use of debugger
            'no-dupe-args'                : 'error',   // disallow duplicate arguments in function definitions
            'no-dupe-keys'                : 'error',   // disallow duplicate keys in object literals
            'no-duplicate-case'           : 'error',   // disallow duplicate case labels
            'no-empty'                    : 'warn',    // disallow empty block statements
            'no-empty-character-class'    : 'error',   // disallow empty character classes in regular expressions
            'no-ex-assign'                : 'error',   // disallow reassigning exceptions in catch clauses
            'no-extra-boolean-cast'       : 'error',   // disallow unnecessary boolean casts
            'no-extra-parens'             : [ 'warn', 'all', { 'nestedBinaryExpressions': false, 'ternaryOperandBinaryExpressions': false, 'enforceForArrowConditionals': false } ],    // disallow unnecessary parentheses
            'no-extra-semi'               : 'error',   // disallow unnecessary semicolons
            'no-func-assign'              : 'error',   // disallow reassigning function declarations
            'no-inner-declarations'       : 'error',   // disallow function or var declarations in nested blocks
            'no-invalid-regexp'           : 'error',   // disallow invalid regular expression strings in RegExp constructors
            'no-irregular-whitespace'     : 'error',   // disallow irregular whitespace outside of strings and comments
            'no-obj-calls'                : 'error',   // disallow calling global object properties as functions
            'no-prototype-builtins'       : 'off',     // Disallow use of Object.prototypes builtins directly
            'no-regex-spaces'             : 'error',   // disallow multiple spaces in regular expression literals
            'no-sparse-arrays'            : 'error',   // disallow sparse arrays
            'no-template-curly-in-string' : 'warn',
            'no-unexpected-multiline'     : 'error',   // disallow confusing multiline expressions
            'no-unreachable'              : 'error',   // disallow unreachable code after return, throw, continue, and break statements
            'no-unsafe-finally'           : 'error',   // disallow control flow statements in finally blocks
            'no-unsafe-negation'          : 'error',
            'use-isnan'                   : 'error',   // require calls to isNaN() when checking for NaN
            'valid-typeof'                : 'error',   // enforce comparing typeof expressions against valid strings

            // Best Practices
            // These rules relate to better ways of doing things to help you avoid problems:
            'accessor-pairs'               : 'error',   // enforce getter and setter pairs in objects
            'array-callback-return'        : 'error',   // enforce return statements in callbacks of array methods
            'block-scoped-var'             : 'error',   // enforce the use of variables within the scope they are defined
            'class-methods-use-this'       : 'off',
            'complexity'                   : [ 'off', { 'max': 5 } ],   // enforce a maximum cyclomatic complexity allowed in a program
            'consistent-return'            : 'error',   // require return statements to either always or never specify values
            'curly'                        : 'error',   // enforce consistent brace style for all control statements
            'default-case'                 : 'error',   // require default cases in switch statements
            'dot-location'                 : [ 'error', 'property' ],   // enforce consistent newlines before and after dots
            'dot-notation'                 : 'error',   // enforce dot notation whenever possible
            'eqeqeq'                       : 'error',   // require the use of === and !==
            'guard-for-in'                 : 'error',   // require for-in loops to include an if statement
            'max-classes-per-file'         : ['off', 1],
            'no-alert'                     : 'error',   // disallow the use of alert, confirm, and prompt
            'no-caller'                    : 'error',   // disallow the use of arguments.caller or arguments.callee
            'no-case-declarations'         : 'error',   // disallow lexical declarations in case clauses
            'no-div-regex'                 : 'error',   // disallow division operators explicitly at the beginning of regular expressions
            'no-else-return'               : 'off',     // disallow else blocks after return statements in if statements
            'no-empty-function'            : 'off',     // disallow empty functions
            'no-empty-pattern'             : 'error',   // disallow empty destructuring patterns
            'no-eq-null'                   : 'error',   // disallow null comparisons without type-checking operators
            'no-eval'                      : 'error',   // disallow the use of eval()
            'no-extend-native'             : 'error',   // disallow extending native types
            'no-extra-bind'                : 'error',   // disallow unnecessary calls to .bind()
            'no-extra-label'               : 'off',     // disallow unnecessary labels - because of rule no-labels, this rule does nothing
            'no-fallthrough'               : 'error',   // disallow fallthrough of case statements
            'no-floating-decimal'          : 'error',   // disallow leading or trailing decimal points in numeric literals
            'no-global-assign'             : 'error',   // disallow assignments to native objects or read-only global variables
            'no-implicit-coercion'         : 'error',   // disallow shorthand type conversions
            'no-implicit-globals'          : 'error',   // disallow var and named function declarations in the global scope
            'no-implied-eval'              : 'error',   // disallow the use of eval()-like methods
            'no-invalid-this'              : 'error',   // disallow this keywords outside of classes or class-like objects
            'no-iterator'                  : 'error',   // disallow the use of the __iterator__ property
            'no-labels'                    : 'error',   // disallow labeled statements
            'no-lone-blocks'               : 'error',   // disallow unnecessary nested blocks
            'no-loop-func'                 : 'error',   // disallow function declarations and expressions inside loop statements
            'no-magic-numbers'             : 'off',     // disallow magic numbers
            'no-multi-spaces'              : [ 'warn', { 'ignoreEOLComments': true, 'exceptions': { 'VariableDeclarator': true, 'ImportDeclaration': true, 'Property': true }} ],  // disallow multiple spaces
            'no-multi-str'                 : 'error',   // disallow multiline strings
            'no-new'                       : 'error',   // disallow new operators outside of assignments or comparisons
            'no-new-func'                  : 'error',   // disallow new operators with the Function object
            'no-new-wrappers'              : 'error',   // disallow new operators with the String, Number, and Boolean objects
            'no-octal'                     : 'error',   // disallow octal literals
            'no-octal-escape'              : 'error',   // disallow octal escape sequences in string literals
            'no-param-reassign'            : 'warn',    // disallow reassigning function parameters
            'no-proto'                     : 'error',   // disallow the use of the __proto__ property
            'no-redeclare'                 : 'error',   // disallow var redeclaration
            'no-restricted-properties'     : 'off',     // disallow certain properties on certain objects
            'no-return-assign'             : 'error',   // disallow assignment operators in return statements
            'no-script-url'                : 'error',   // disallow javascript': 'error',   // urls
            'no-self-assign'               : 'error',   // disallow assignments where both sides are exactly the same
            'no-self-compare'              : 'error',   // disallow comparisons where both sides are exactly the same
            'no-sequences'                 : 'error',   // disallow comma operators
            'no-throw-literal'             : 'error',   // disallow throwing literals as exceptions
            'no-unmodified-loop-condition' : 'error',   // disallow unmodified loop conditions
            'no-unused-expressions'        : 'off',     // disallow unused expressions - replaced by plugin
            'no-unused-labels'             : 'off',     // disallow unused labels - because of rule no-labels, this rule does nothing
            'no-useless-call'              : 'error',   // disallow unnecessary calls to .call() and .apply()
            'no-useless-concat'            : 'error',   // disallow unnecessary concatenation of literals or template literals
            'no-useless-escape'            : 'error',   // disallow unnecessary escape characters
            'no-useless-return'            : 'error',   // disallow redundant return statements
            'no-void'                      : 'error',   // disallow void operators
            'no-warning-comments'          : 'off',     // disallow specified warning terms in comments (i.e. TODO)
            'no-with'                      : 'error',   // disallow with statements
            'prefer-promise-reject-errors' : 'warn',    // require using Error objects as Promise rejection reasons
            'radix'                        : 'error',   // enforce the consistent use of the radix argument when using parseInt()
            'vars-on-top'                  : 'off',     // require var declarations be placed at the top of their containing scope
            'wrap-iife'                    : ['error', 'outside'],   // require parentheses around immediate function invocations
            'yoda'                         : 'error',   // require or disallow "Yoda" conditions

            // Strict Mode
            // These rules relate to strict mode directives:
            'strict': [ 'error', 'global' ],   // require or disallow strict mode directives

            // Variables
            // These rules relate to variable declarations:
            'init-declarations'          : 'off',   // require or disallow initialization in var declarations - off in favour of no-unassigned-vars
            'no-delete-var'              : 'error', // disallow deleting variables
            'no-label-var'               : 'off',   // disallow labels that share a name with a variable - because of rule no-labels, this rule does nothing
            'no-restricted-globals'      : 'off',   // disallow specified global variables
            'no-shadow'                  : 'off',   // disallow var declarations from shadowing variables in the outer scope
            'no-shadow-restricted-names' : 'error', // disallow identifiers from shadowing restricted names
            'no-unassigned-vars'         : 'error', // disallow unassigned variables
            'no-undef'                   : 'error', // disallow the use of undeclared variables unless mentioned in /*global */ comments
            'no-undef-init'              : 'error', // disallow initializing variables to undefined
            'no-undefined'               : 'off',   // disallow the use of undefined as an identifier
            'no-unused-vars'             : [ "error", {  "varsIgnorePattern": "^_" } ], // disallow unused variables
            'no-use-before-define'       : [ 'error', { 'functions': false, 'classes': false } ],  // disallow the use of variables before they are defined

            // Node.js and CommonJS
            // These rules relate to code running in Node.js, or in browsers with CommonJS:
            'n/callback-return'       : 'off',   // require return statements after callbacks
            'n/global-require'        : 'error', // require require() calls to be placed at top-level module scope
            'n/handle-callback-err'   : 'error', // require error handling in callbacks
            'n/no-deprecated-api'     : 'error', // disallow use of the Buffer() constructor
            'n/no-mixed-requires'     : 'error', // disallow require calls to be mixed with regular var declarations
            'n/no-new-require'        : 'error', // disallow new operators with calls to require
            'n/no-path-concat'        : 'error', // disallow string concatenation with __dirname and __filename
            'n/no-process-env'        : 'error', // disallow the use of process.env
            'n/no-process-exit'       : 'off',   // disallow the use of process.exit()
            'n/no-restricted-require' : 'off',   // disallow specified modules when loaded by require
            'n/no-restricted-import'  : 'off',   // disallow specified modules when loaded by import
            'n/no-sync'               : 'off',   // disallow synchronous methods

            // Stylistic Issues
            // These rules relate to style guidelines, and are therefore quite subjective:
            'array-bracket-newline'           : ['error', 'consistent'], // enforce linebreaks after opening and before closing array brackets
            'array-bracket-spacing'           : 'error', // enforce consistent spacing inside array brackets
            'array-element-newline'           : ['off', 'consistent'],   // enforce line breaks after each array element
            'block-spacing'                   : 'error', // enforce consistent spacing inside single-line blocks
            'brace-style'                     : [ 'error', '1tbs' ],   // enforce consistent brace style for blocks
            'camelcase'                       : 'off',   // enforce camelcase naming convention
            'capitalized-comments'            : ['off', 'always'], // enforce or disallow capitalization of the first letter of a comment
            'comma-dangle'                    : [ 'error', 'only-multiline' ],  // require or disallow trailing commas
            'comma-spacing'                   : 'error', // enforce consistent spacing before and after commas
            'comma-style'                     : 'error', // enforce consistent comma style
            'computed-property-spacing'       : [ 'error', 'never' ],   // enforce consistent spacing inside computed property brackets
            'consistent-this'                 : 'off',   // enforce consistent naming when capturing the current execution context
            'eol-last'                        : 'error', // enforce at least one newline at the end of files
            'func-call-spacing'               : [ 'error', 'never' ], // require or disallow spacing between function identifiers and their invocations
            'func-name-matching'              : 'off',   // require function names to match the name of the variable or property to which they are assigned
            'func-names'                      : 'error', // require or disallow named function expressions
            'func-style'                      : [ 'error', 'declaration', { 'allowArrowFunctions': true } ],   // enforce the consistent use of either function declarations or expressions
            'id-denylist'                     : 'off',   // disallow specified identifiers
            'id-length'                       : 'off',   // enforce minimum and maximum identifier lengths
            'id-match'                        : 'off',   // require identifiers to match a specified regular expression
            'implicit-arrow-linebreak'        : 'off',   // enforce the location of arrow function bodies
            'indent'                          : [ 'warn', 4],   // enforce consistent indentation
            'jsx-quotes'                      : 'off',   // enforce the consistent use of either double or single quotes in JSX attributes
            'key-spacing'                     : [ 'error', { 'beforeColon': false, 'afterColon': true, 'align': 'value' } ],   // enforce consistent spacing between keys and values in object literal properties
            'keyword-spacing'                 : 'error', // enforce consistent spacing before and after keywords
            'linebreak-style'                 : [ 'error', 'unix' ],   // enforce consistent linebreak style
            'lines-around-comment'            : 'off',   // require empty lines around comments
            'lines-between-class-members'     : 'off',   // require or disallow an empty line between class members
            'max-depth'                       : 'error', // enforce a maximum depth that blocks can be nested
            'max-len'                         : [ 'off', 160],   // enforce a maximum line length
            'max-lines'                       : 'off',   // enforce a maximum file length
            'max-lines-per-function'          : [ 'off', { 'max': 32, 'skipBlankLines': true, 'skipComments': true } ], // enforce a maximum number of line of code in a function
            'max-nested-callbacks'            : 'error', // enforce a maximum depth that callbacks can be nested
            'max-params'                      : [ 'off', { 'max': 12 } ],   // enforce a maximum number of parameters in function definitions
            'max-statements'                  : [ 'off', { 'max': 32 } ],   // enforce a maximum number of statements allowed in function blocks
            'max-statements-per-line'         : [ 'off', { 'max': 2 } ],   // enforce a maximum number of statements allowed per line
            'multiline-ternary'               : [ 'error', 'always-multiline' ], // enforce newlines between operands of ternary expressions
            'new-cap'                         : 'error', // require constructor function names to begin with a capital letter
            'new-parens'                      : 'error', // require parentheses when invoking a constructor with no arguments
            'newline-per-chained-call'        : [ 'warn', { 'ignoreChainWithDepth': 3 } ],   // require a newline after each call in a method chain
            'no-array-constructor'            : 'error', // disallow Array constructors
            'no-bitwise'                      : 'off',   // disallow bitwise operators
            'no-continue'                     : 'off',   // disallow continue statements
            'no-inline-comments'              : 'off',   // disallow inline comments after code
            'no-lonely-if'                    : 'error', // disallow if statements as the only statement in else blocks
            'no-mixed-operators'              : 'off',   // disallow mixes of different operators
            'no-mixed-spaces-and-tabs'        : 'error', // disallow mixed spaces and tabs for indentation
            'no-multiple-empty-lines'         : [ 'error', { 'max': 2, 'maxEOF': 1 } ],   // disallow multiple empty lines
            'no-negated-condition'            : 'off',   // disallow negated conditions
            'no-nested-ternary'               : 'error', // disallow nested ternary expressions
            'no-object-constructor'           : 'error', // disallow Object constructors
            'no-plusplus'                     : 'off',   // disallow the unary operators ++ and --
            'no-restricted-syntax'            : 'off',   // disallow specified syntax
            'no-ternary'                      : 'off',   // disallow ternary operators
            'no-trailing-spaces'              : 'error', // disallow trailing whitespace at the end of lines
            'no-underscore-dangle'            : [ 'error', { 'allowAfterThis': true } ],   // disallow dangling underscores in identifiers
            'no-unneeded-ternary'             : 'error', // disallow ternary operators when simpler alternatives exist
            'no-whitespace-before-property'   : 'error', // disallow whitespace before properties
            'object-curly-newline'            : [ 'error', { 'multiline': true, 'consistent': true } ],  // enforce consistent line breaks inside braces
            'object-curly-spacing'            : [ 'error', 'always' ],   // enforce consistent spacing inside braces
            'object-property-newline'         : [ 'error', { 'allowAllPropertiesOnSameLine': true } ],   // enforce placing object properties on separate lines
            'one-var-declaration-per-line'    : 'off',   // require or disallow newlines around var declarations - because of rule one-var, this rule does nothing
            'one-var'                         : [ 'error', 'never' ],   // enforce variables to be declared either together or separately in functions
            'operator-assignment'             : [ 'error', 'always' ],  // require or disallow assignment operator shorthand where possible
            'operator-linebreak'              : [ 'error', 'after' ],   // enforce consistent linebreak style for operators
            'padded-blocks'                   : 'off',   // require or disallow padding within blocks
            'padding-line-between-statements' : 'off',   // require or disallow padding lines between statements
            'quote-props'                     : [ 'error', 'consistent-as-needed', { 'keywords': true } ],   // require quotes around object literal property names
            'quotes'                          : [ 'error', 'single', { 'avoidEscape': true, 'allowTemplateLiterals': true } ],   // enforce the consistent use of either backticks, double, or single quotes
            'semi'                            : [ 'error', 'always' ],   // require or disallow semicolons instead of ASI
            'semi-spacing'                    : 'error', // enforce consistent spacing before and after semicolons
            'sort-vars'                       : 'off',   // require variables within the same declaration block to be sorted
            'space-before-blocks'             : [ 'error', 'always' ],   // enforce consistent spacing before blocks
            'space-before-function-paren'     : [ 'error', 'never' ],   // enforce consistent spacing before function definition opening parenthesis
            'space-in-parens'                 : [ 'error', 'never' ],   // enforce consistent spacing inside parentheses
            'space-infix-ops'                 : 'error', // require spacing around operators
            'space-unary-ops'                 : 'error', // enforce consistent spacing before or after unary operators
            'spaced-comment'                  : [ 'off', 'always', { 'exceptions': [ '*' ] } ],  // enforce consistent spacing after the // or /* in a comment
            'switch-colon-spacing'            : [ 'error', { 'after': true, 'before': false } ], // enforce spacing around colons of switch statements
            'template-tag-spacing'            : ['error', 'always'], // require or disallow spacing between template tags and their literals'
            'unicode-bom'                     : 'off',   // require or disallow the Unicode BOM
            'wrap-regex'                      : 'error', // require parenthesis around regex literals

            // ECMAScript 6
            // These rules relate to ES6, also known as ES2015:
            'arrow-body-style'             : [ 'off', 'as-needed' ],     // require braces around arrow function bodies
            'arrow-parens'                 : [ 'off', 'as-needed' ],     // require parentheses around arrow function arguments
            'arrow-spacing'                : 'error',   // enforce consistent spacing before and after the arrow in arrow functions
            'constructor-super'            : 'error',   // require super() calls in constructors
            'generator-star-spacing'       : [ 'error', 'before' ],   // enforce consistent spacing around * operators in generator functions
            'no-class-assign'              : 'error',   // disallow reassigning class members
            'no-confusing-arrow'           : [ 'error', { 'allowParens': true } ],   // disallow arrow functions where they could be confused with comparisons
            'no-const-assign'              : 'error',   // disallow reassigning const variables
            'no-dupe-class-members'        : 'error',   // disallow duplicate class members
            'no-duplicate-imports'         : [ 'error', { 'includeExports': true } ],   // disallow duplicate module imports
            'no-new-native-nonconstructor' : 'error',   // disallow new operators with the Symbol object
            'no-restricted-imports'        : 'off',     // disallow specified modules when loaded by import
            'no-this-before-super'         : 'error',   // disallow this/super before calling super() in constructors
            'no-useless-computed-key'      : 'error',   // disallow unnecessary computed property keys in object literals
            'no-useless-constructor'       : 'error',   // disallow unnecessary constructors
            'no-useless-rename'            : 'error',   // disallow renaming import, export, and destructured assignments to the same name
            'no-var'                       : 'error',   // require let or const instead of var
            'object-shorthand'             : [ 'error', 'properties' ],   // require or disallow method and property shorthand syntax for object literals
            'prefer-arrow-callback'        : [ 'error', { 'allowNamedFunctions': true } ],   // require arrow functions as callbacks
            'prefer-const'                 : 'error',   // require const declarations for variables that are never reassigned after declared
            'prefer-destructuring'         : 'off',     // require destructuring from arrays and/or objects
            'prefer-numeric-literals'      : 'error',   // disallow parseInt() and Number.parseInt() in favor of binary, octal, and hexadecimal literals
            'prefer-rest-params'           : 'error',   // require rest parameters instead of arguments
            'prefer-spread'                : 'error',   // require spread operators instead of .apply()
            'prefer-template'              : 'warn',    // require template literals instead of string concatenation
            'require-yield'                : 'error',   // require generator functions to contain yield
            'rest-spread-spacing'          : [ 'error', 'never' ],   // enforce spacing between rest and spread operators and their expressions
            'sort-imports'                 : 'off',     // enforce sorted import declarations within modules
            'symbol-description'           : 'error',   // require symbol descriptions
            'template-curly-spacing'       : [ 'error', 'never' ],   // require or disallow spacing around embedded expressions of template strings
            'yield-star-spacing'           : [ 'error', 'before' ]   // require or disallow spacing around the * in yield* expressions
        }
    }
]);