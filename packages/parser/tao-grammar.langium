grammar TaoLang

entry TaoFile:
    statements += Statement*;

// Shared Types
///////////////

type Referenceable = XDeclaration | ParameterDeclaration;

type ScopeRelevantNode = UseStatement | XDeclaration | AppDeclaration | ParameterDeclaration;

type ViewStatement = ViewRender | Injection | AssignmentDeclaration | BlockDeclaration;
type TopLevelStatement = XDeclaration | UseStatement | Injection;
type ActionStatement = StateUpdate | Injection | AssignmentDeclaration | BlockDeclaration;

Statement: XDeclaration | ModuleDeclaration | UseStatement | Injection | ViewRender | StateUpdate;

// Shared Statements
////////////////////

terminal TS_CODE_BLOCK: '```ts' -> '```';
Injection:
    'inject' isRaw='raw'? tsCodeBlock=TS_CODE_BLOCK;


// TODO: Remove this.
type ImportableDeclaration = XDeclaration;

// Top/File Level Statements
////////////////////////////


terminal USE_MODULE_PATH: /(@[a-zA-Z0-9._\-]+\/[a-zA-Z0-9._\-\/]+)|([a-zA-Z.][a-zA-Z0-9._\-]*\/[a-zA-Z0-9._\-\/]*)/;
UseStatement:
    'use' importedNames+=ID (',' importedNames+=ID)* ('from' modulePath=USE_MODULE_PATH)?;

XDeclaration: AppDeclaration | AssignmentDeclaration | BlockDeclaration;

AppDeclaration:
    type='app' name=ID '{' appStatements += AppStatement* '}';
AppStatement:
    ( type='ui' ui=[Referenceable:ID]
    // | type='root' root=[Declaration:ID]
    );

DeclarationVisibility returns string: 'file' | 'share' | 'module';
ModuleDeclaration:
    visibility=DeclarationVisibility declaration=XDeclaration;

AssignmentType returns string: 'alias' | 'state';
AssignmentDeclaration:
    type=AssignmentType name=ID '=' value=Expression;

BlockDeclaration: ViewDeclaration | ActionDeclaration;
InlineBlock: InlineView | InlineAction;

type View = ViewDeclaration | InlineView;
type Action = ActionDeclaration | InlineAction;

ViewDeclaration: type='view' name=ID parameterList=ParameterList? block=Block;
ActionDeclaration: type='action' name=ID parameterList=ParameterList? block=Block;

InlineView: type='view' parameterList=ParameterList? block=Block;
InlineAction: type='action' parameterList=ParameterList? block=Block;


Block:
    '{' statements += Statement* '}';

ViewRender:
    view=[XDeclaration:ID] args=ArgsList? block=Block?;

StateUpdateOperator returns string: '+=' | '-=' | '=';
StateUpdate:
    'set' stateRef=[Referenceable:ID] op=StateUpdateOperator value=Expression;

// Parameters and Arguments
///////////////////////////

type NodeWithParameters = BlockDeclaration; // TODO: Remove this?

ParameterList:
    parameters += ParameterDeclaration (',' parameters += ParameterDeclaration)*;

ParameterDeclaration:
    name=ID ParameterType;
fragment ParameterType:
    type='string' | type='number';

ArgsList: // TODO: Rename to ArgumentList? (singular, expanded)
    args += Argument (',' args += Argument)*;

Argument:
    name=ID value=Expression;



// Value Expressions
////////////////////

Expression:
    StringLiteral | NumberLiteral |  NamedReference | InlineBlock;

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




// BaseStatement:
//     Declaration | Injection;

// Declaration:
//     AliasDeclaration | ViewDeclaration | ActionDeclaration | StateDeclaration;

// AliasDeclaration:
//     'alias' name=ID '=' value=Expression;



// StateDeclaration:
//     type='state' name=ID '=' value=Expression;

// TopLevelDeclaration:
//     visibility=TopLevelDeclarationVisibility? declaration=XDeclaration;
// TopLevelDeclarationVisibility returns string:
//     'file' | 'share' | 'module'; // Optional; when absent, declaration is module


// Views
////////

// ViewDeclaration:
//     type='view' name=ID parameterList=ParameterList? '{'
//         viewStatements += ViewStatement*
//     '}';

// ViewStatement:
//     BaseStatement | StateDeclaration | ViewRenderStatement;

// ViewRenderStatement:
//     view=[ViewDeclaration:ID] args=ArgsList? ('{' viewStatements += ViewStatement* '}')?;


// Actions
//////////

// ActionDeclaration:
//     type='action' name=ID parameterList=ParameterList? '{'
//         actionStatements += ActionStatement*
//     '}';

// ActionStatement:
//     Injection | StateUpdateStatement;

// StateUpdateStatement:
//     'set' stateRef=[Referenceable:ID] op=StateUpdateOperator value=Expression;

// StateUpdateOperator returns string:
//     '+=' | '-=' | '=';
