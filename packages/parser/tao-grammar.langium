grammar TaoLang

entry TaoFile:
    statements += Statement*;

Statement: Declaration | ModuleDeclaration | UseStatement | Debugger | Injection | ViewRender | StateUpdate;



// Shared Types
///////////////

type Referenceable = Declaration | ParameterDeclaration;
type ReactiveBinding = NamedReference | StateUpdate;

type ScopeRelevantNode = UseStatement | Declaration | AppDeclaration | ParameterDeclaration;

type ViewStatement = ViewRender | Injection | AssignmentDeclaration | BlockDeclaration | Debugger;
type TopLevelStatement = Declaration | UseStatement | Injection | Debugger;
type ActionStatement = StateUpdate | Injection | Debugger | AssignmentDeclaration | BlockDeclaration;

// Shared Statements
////////////////////

Declaration: AppDeclaration | AssignmentDeclaration | BlockDeclaration;

AssignmentType returns string: 'alias' | 'state';
AssignmentDeclaration:
    type=AssignmentType name=ID '=' value=Expression;

Block:
    '{' statements += Statement* '}';

terminal TS_CODE_BLOCK: '```ts' -> '```';
Injection:
    'inject' type='raw'? tsCodeBlock=TS_CODE_BLOCK;

Debugger:
    type='debugger';

// Top/File Level Statements
////////////////////////////

terminal USE_MODULE_PATH: /(@[a-zA-Z0-9._\-]+\/[a-zA-Z0-9._\-\/]+)|([a-zA-Z.][a-zA-Z0-9._\-]*\/[a-zA-Z0-9._\-\/]*)/;
UseStatement:
    'use' importedNames+=ID (',' importedNames+=ID)* ('from' modulePath=USE_MODULE_PATH)?;

AppDeclaration:
    type='app' name=ID '{' appStatements += AppStatement* '}';
AppStatement:
    ( type='ui' ui=[Referenceable:ID]
    // | type='root' root=[Declaration:ID]
    );

DeclarationVisibility returns string: 'hide' | 'share' | 'module';
ModuleDeclaration:
    visibility=DeclarationVisibility declaration=Declaration;


// Declarations
///////////////

BlockDeclaration: ViewDeclaration | ActionDeclaration;

ViewDeclaration: type='view' name=ID parameterList=ParameterList? block=Block;
ActionDeclaration: type='action' name=ID parameterList=ParameterList? block=Block;


// View-only statements
///////////////////////

ViewRender:
    view=[Declaration:ID] argumentList=ArgumentList? block=Block?;
type RenderNode = ViewRender | Injection;

// Action-only statements
/////////////////////////

StateUpdateOperator returns string: '=' | '+=' | '-=' | '*=' | '/='
;
StateUpdate:
    'set' stateRef=[Referenceable:ID] operator=StateUpdateOperator value=Expression;

type LiveStateBinding = StateUpdate;

// Parameters and Arguments
///////////////////////////

ParameterList:
    parameters += ParameterDeclaration (',' parameters += ParameterDeclaration)*;

ParameterType returns string: 'string' | 'number' | 'any';
ParameterDeclaration:
    name=ID type=ParameterType;

ArgumentList: // TODO: Rename to ArgumentList? (singular, expanded)
    arguments += Argument (',' arguments += Argument)*;

Argument:
    name=ID value=Expression;


// Value Expressions
////////////////////

Expression:
    Addition;

Addition infers Expression:
    Multiplication ({infer BinaryExpression.left=current} op=('+' | '-') right=Multiplication)*;

Multiplication infers Expression:
    UnaryExpression ({infer BinaryExpression.left=current} op=('*' | '/') right=UnaryExpression)*;

UnaryExpression infers Expression:
    ({infer UnaryExpression} op='-' operand=PrimaryExpression) | PrimaryExpression;

// Inline action for arguments, e.g. `Button title "Go", Action action { set n = 1 }`
ActionExpression: 'action' name=ID? block=Block;

PrimaryExpression infers Expression:
    '(' Expression ')' | StringLiteral | NumberLiteral | ActionExpression | NamedReference;

StringLiteral:
    string=STRING;

NumberLiteral:
    number=NUMBER;

NamedReference:
    referenceName=[Referenceable:ID];


// Terminals. Order matters!
////////////////////////////

hidden terminal WS: /\s+/;
// Block/line comments before other terminals so `/*` is not split into `/` and `*` (operator keywords).
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal STRING: /"(\\.|[^"\\])*"/; // <- Only double quotes.
// If we want to allow single quotes -> /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;

terminal NUMBER returns number: /[0-9]+/;
