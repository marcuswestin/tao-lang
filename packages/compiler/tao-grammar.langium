grammar TaoLang

entry TaoFile:
    topLevelStatements += TopLevelStatement*;


// Top/File Level Statements
////////////////////////////


TopLevelStatement:
    UseStatement | TopLevelDeclaration | Injection;

TopLevelDeclaration:
    visibility=DeclarationVisibility? declaration=(AppDeclaration | Declaration);

DeclarationVisibility returns string:
    'file' | 'share' | 'module'; // Optional; when absent, declaration is module

terminal USE_MODULE_PATH: /[a-zA-Z.][a-zA-Z0-9._\-]*\/[a-zA-Z0-9._\-\/]*/;
UseStatement:
    'use' importedNames+=ID (',' importedNames+=ID)* ('from' modulePath=USE_MODULE_PATH)?;

AppDeclaration:
    type='app' name=ID '{' appStatements += AppStatement* '}';

AppStatement:
    ( type='ui' ui=[Declaration:ID]
    // | type='root' root=[Declaration:ID]
    );


// Statements
/////////////

BaseStatement:
    Declaration | Injection;

Declaration:
    ViewDeclaration | AliasDeclaration;


terminal TS_CODE_BLOCK: '```ts' -> '```';
Injection:
    'inject' tsCodeBlock=TS_CODE_BLOCK;

// Scopes and Blocks
////////////////////

type ScopeRelevantNode = TopLevelStatement | Declaration | AppDeclaration | ParameterDeclaration;

type ImportableDeclaration = AppDeclaration | ViewDeclaration;


// Parameters
/////////////

ParameterList:
    parameters += ParameterDeclaration (',' parameters += ParameterDeclaration)*;

ParameterDeclaration:
    name=ID ParameterType;

fragment ParameterType:
    type='string' | type='number';

ArgsList:
    args += Argument (',' args += Argument)*;

Argument:
    name=ID value=Expression;


// Views
////////

ViewDeclaration:
    type='view' name=ID parameterList=ParameterList? '{'
        viewStatements += ViewStatement*
    '}';

ViewStatement:
    BaseStatement | ViewRenderStatement;

AliasDeclaration:
    'alias' name=ID '=' value=Expression;

ViewRenderStatement:
    view=[ViewDeclaration:ID] args=ArgsList? ('{' viewStatements += ViewStatement* '}')?;


// Value Expressions
////////////////////

Expression:
    StringLiteral | NumberLiteral | NamedReference;

StringLiteral:
    string=STRING;

NumberLiteral:
    number=NUMBER;

NamedReference:
    referenceName=[Referenceable:ID];

type Referenceable = AliasDeclaration | ParameterDeclaration | ViewDeclaration | AppDeclaration;


// Terminals. Order matters!
////////////////////////////

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;
terminal NUMBER returns number: /[0-9]+/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
