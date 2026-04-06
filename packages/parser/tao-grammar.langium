grammar TaoLang

entry TaoFile:
    topLevelStatements += TopLevelStatement*;

// Shared Types
///////////////

type Referenceable = TopLevelDeclarationTypes | Declaration | ParameterDeclaration;

type ScopeRelevantNode = TopLevelStatement | Declaration | AppDeclaration | ParameterDeclaration;

type ImportableDeclaration = TopLevelDeclarationTypes;

type InvocableDeclaration = ViewDeclaration | ActionDeclaration;


// Shared Statements
////////////////////

BaseStatement:
    Declaration | Injection;

Declaration:
    AliasDeclaration | ViewDeclaration | ActionDeclaration;

AliasDeclaration:
    'alias' name=ID '=' value=Expression;

terminal TS_CODE_BLOCK: '```ts' -> '```';
Injection:
    'inject' isRaw='raw'? tsCodeBlock=TS_CODE_BLOCK;


// Top/File Level Statements
////////////////////////////


TopLevelStatement:
    UseStatement | TopLevelDeclaration | Injection;

TopLevelDeclarationTypes:
    Declaration | AppDeclaration;

TopLevelDeclaration:
    visibility=TopLevelDeclarationVisibility? declaration=TopLevelDeclarationTypes;
TopLevelDeclarationVisibility returns string:
    'file' | 'share' | 'module'; // Optional; when absent, declaration is module

terminal USE_MODULE_PATH: /(@[a-zA-Z0-9._\-]+\/[a-zA-Z0-9._\-\/]+)|([a-zA-Z.][a-zA-Z0-9._\-]*\/[a-zA-Z0-9._\-\/]*)/;
UseStatement:
    'use' importedNames+=ID (',' importedNames+=ID)* ('from' modulePath=USE_MODULE_PATH)?;

AppDeclaration:
    type='app' name=ID '{' appStatements += AppStatement* '}';

AppStatement:
    ( type='ui' ui=[Declaration:ID]
    // | type='root' root=[Declaration:ID]
    );


// Parameters and Arguments
///////////////////////////

type NodeWithParameters =
    ViewDeclaration | ActionDeclaration;

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
    ViewBlockStatement | ViewRenderStatement;

ViewBlockStatement:
    BaseStatement;

ViewRenderStatement:
    view=[ViewDeclaration:ID] args=ArgsList? ('{' viewStatements += ViewStatement* '}')?;


// Actions
//////////

ActionDeclaration:
    type='action' name=ID parameterList=ParameterList? '{'
        actionStatements += ActionStatement*
    '}';

ActionStatement:
    Injection;


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


// Terminals. Order matters!
////////////////////////////

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal STRING: /"(\\.|[^"\\])*"/; // <- Only double quotes.
// If we want to allow single quotes -> /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;

terminal NUMBER returns number: /[0-9]+/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
