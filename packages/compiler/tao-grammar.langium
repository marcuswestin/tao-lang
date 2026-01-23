grammar TaoLang

entry TaoFile:
    topLevelStatements += TopLevelStatement*;

// Imports
//////////

UseStatement:
    'use' modulePath=RELATIVE_PATH importedNames+=ID (',' importedNames+=ID)*;

terminal RELATIVE_PATH: /(\.\.\/)+[a-zA-Z0-9_\-\/]*|\.\/[a-zA-Z0-9_\-\/]*/;

TopLevelStatement:
    UseStatement | BaseStatement | VisibilityMarkedDeclaration;

DeclarationVisibility returns string:
    'hide' | 'share'; // Defaults to module-visible

VisibilityMarkedDeclaration:
    visibility=DeclarationVisibility declaration=Declaration;

// Statements
/////////////

BaseStatement:
    ( Declaration
    | Injection
    );

Declaration:
    ( AppDeclaration
    | ViewDeclaration
    );

// Declarations
///////////////

AppDeclaration:
    type='app' name=ID '{' appStatements += AppStatement* '}';

ViewDeclaration:
    type='view' name=ID parameterList=ParameterList? '{'
        viewStatements += ViewStatement*
    '}';


fragment ValueType:
    type='string' | type='number';

terminal TS_CODE_BLOCK: '```ts' -> '```';
Injection:
    'inject' tsCodeBlock=TS_CODE_BLOCK;

// Shared Grammer
/////////////////

ParameterList:
    parameters += Parameter (',' parameter += Parameter)*;

Parameter:
    key=ID? ValueType;

ArgsList:
    args += Argument (',' args += Argument)*;

Argument:
    key=ID value=Expression;


// App declaration
//////////////////

AppStatement:
    ( type='ui' ui=[Declaration:ID]
    // | type='root' root=[Declaration:ID]
    );


// View declaration
///////////////////

ViewStatement:
    ViewRenderStatement | Injection;

ViewRenderStatement:
    view=[ViewDeclaration:ID] args=ArgsList? body=ViewBody?;

ViewBody:
    '{'
        viewStatements += ViewStatement*
    '}';

// Values and Expressions

Expression:
    StringLiteral | NumberLiteral;

StringLiteral:
    string=STRING;

NumberLiteral:
    number=NUMBER;

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;
terminal NUMBER returns number: /[0-9]+/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;

