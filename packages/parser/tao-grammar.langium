grammar TaoLang

entry TaoFile:
    statements += Statement*;

Statement: Declaration | ModuleDeclaration | UseStatement | Debugger | Injection | ViewRender | ActionRender | StateUpdate;



// Shared Types
///////////////

type Referenceable = Declaration | ParameterDeclaration;

type ScopeRelevantNode = UseStatement | Declaration | AppDeclaration | ParameterDeclaration;

type ViewStatement = ViewRender | Injection | AssignmentDeclaration | BlockDeclaration | Debugger;
type TopLevelStatement = Declaration | UseStatement | Injection | Debugger;
type ActionStatement = StateUpdate | Injection | Debugger | AssignmentDeclaration | BlockDeclaration | ActionRender;

// ArgumentListHost groups the call-site nodes that own an `ArgumentList`. Generic argument-binding logic
// (see `tao-argument-bindings.ts`) keys off this union, so adding a new host kind (e.g. function calls)
// only requires extending this type and the resolver's callee dispatch.
type ArgumentListHost = ViewRender | ActionRender;

// Shared Statements
////////////////////

RuntimeDeclaration: AppDeclaration | AssignmentDeclaration | BlockDeclaration;
Declaration: RuntimeDeclaration | TypeDeclaration;

PrimitiveType returns string: 'text' | 'number' | 'boolean' | 'action' | 'view';

// Type expressions form the type-position grammar.
// `TypeExpression` is the full form (primitive, named, or struct shape) and is used in
//  - `TypeDeclaration.base` (a `type X is { … }` struct base)
//  - `StructFieldDeclaration.type` (which permits nested struct shapes for `Person.Job`-style nested types).
// `TypeReference` is the restricted form (primitive or named only — no inline struct shapes) used in
// `ParameterDeclaration.type`, where an inline `{ … }` would otherwise collide with the trailing block.
TypeExpression: PrimitiveTypeRef | NamedTypeRef | StructTypeExpression;
TypeReference: PrimitiveTypeRef | NamedTypeRef;

PrimitiveTypeRef: primitive=PrimitiveType;
// `segments` carries `Person.Job`-style nested type lookups; the resolver walks them through the
// referenced type's struct fields. The bare-ID case (no segments) is the common path.
NamedTypeRef: ref=[TypeDeclaration:ID] ('.' segments+=ID)*;

// Struct shape, e.g. `{ Name text, Age number }`. Reachable from type positions only — disjoint from
// `Block` (view/action/app body) and `ObjectLiteral` (expression-position object literal).
StructTypeExpression:
    '{' fields+=StructFieldDeclaration (',' fields+=StructFieldDeclaration)* ','? '}';

StructFieldDeclaration: name=ID type=TypeExpression;

TypeDeclaration: 'type' name=ID 'is' base=TypeExpression;

AssignmentType returns string: 'alias' | 'state';
AssignmentDeclaration:
    type=AssignmentType name=ID '=' value=(ObjectLiteral | Expression);

// Invariant: `Block` and `ObjectLiteral` both use `{` `}`; freestanding `Expression` must not start with `{` so
// `ViewRender`/`ActionRender` can parse `argumentList?` then `block?` without `{` ambiguity. `ObjectLiteral` is
// reachable from `TypedLiteralExpression.value`, `AssignmentDeclaration.value`, and `ObjectProperty.value`
// (nested `{ … }` inside object shapes only — not as a top-level `ArgumentList` expression).
// `Block` is only used in views/actions/apps. Keep parser tests that assert these contexts stay separate.
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
    'set' target=MemberAccessExpression operator=StateUpdateOperator value=Expression;

// Invocation of a declared action from inside another action body, e.g.
// `do LogEvent Message "submitted", Level "info"`. The leading `do` keyword
// disambiguates from `ViewRender` (same `Name Arg val …` shape but different
// callee kind). Argument binding flows through the shared resolver in
// `tao-argument-bindings.ts`. Optional `block` mirrors `ViewRender` for nested
// action statements after the call.
ActionRender:
    'do' action=[Declaration:ID] argumentList=ArgumentList? block=Block?;

// Parameters and Arguments
///////////////////////////

ParameterList:
    parameters += ParameterDeclaration (',' parameters += ParameterDeclaration)*;

// `name` is the parameter binding name; `type` is the explicit `TypeReference`.
// When `type` is absent, shorthand: `name` must resolve to a `TypeDeclaration` and the parameter's type equals
// that type (validator). `name` stays as `name` (not `nameOrType`) to satisfy the `Referenceable` contract —
// Langium's scope system requires a `name` property on cross-referenceable nodes.
// `localSuperType` (via `is`) declares a view-local nominal type: `Title is text` creates `ViewName.Title`.
ParameterDeclaration:
    name=ID ('is' localSuperType=TypeReference | type=TypeReference)?;

// `ArgumentList` is the shared shape carried by every `ArgumentListHost` (see the type alias above).
// Each argument is a plain expression; binding to callee parameters is type-driven — see `tao-argument-bindings.ts`.
ArgumentList:
    arguments += Expression (',' arguments += Expression)*;


// Value Expressions
////////////////////

Expression:
    Addition;

Addition infers Expression:
    Multiplication ({infer BinaryExpression.left=current} op=('+' | '-') right=Multiplication)*;

Multiplication infers Expression:
    UnaryExpression ({infer BinaryExpression.left=current} op=('*' | '/') right=UnaryExpression)*;

UnaryExpression infers Expression:
    ({infer UnaryExpression} op='-' operand=UnaryOperand)
    | TypedLiteralExpression
    | MemberAccessExpression
    | PostfixExpression;

UnaryOperand:
    TypedLiteralExpression | MemberAccessExpression | PostfixExpression;

// Inline anonymous action for arguments, e.g. `Button Title "Go", Action action { set N = 1 }`.
// Named actions must be declared via `action Name { ... }` and referenced by name — the inline form is anonymous only.
ActionExpression: 'action' block=Block;

// Typed-literal expression: attaches a nominal type name to a literal value, e.g. `FirstName "John"`,
// `Age 30`, `Person { Name "Ro", Age 40 }`, qualified `Badge.Title "Save"`, or dot-local `.Title "Save"`.
// Uses `NamedTypeRef` so dotted constructor heads (`Owner.LocalType`) parse as a single expression.
// `DotLocalTypeRef` supports `.Title` shorthand for callee-local parameter types in argument context.
// `ObjectLiteral` is kept as an explicit branch because it is excluded from `Expression` (block ambiguity).
// Value stays restricted to literal forms (string/number/object) to avoid parse ambiguity with
// `MemberAccessExpression` — `Name Counter` must parse as `ViewRender`, not `TypedLiteralExpression`.
TypedLiteralExpression:
    type=(NamedTypeRef | DotLocalTypeRef) value=(StringTemplateExpression | NumberLiteral | ObjectLiteral);

// Dot-prefixed callee-local type reference for typed literals, e.g. `.Title` in `Badge .Title "x"`.
// Resolves through the enclosing argument context's callee, not through lexical scope.
DotLocalTypeRef: '.' name=ID;

// Flat shape: a referenceable root plus an optional static `.prop` chain. Always yields a concrete `MemberAccessExpression` node (bare `X` has empty `properties`).
MemberAccessExpression:
    root=[Referenceable:ID] ('.' properties+=ID)*;

// PostfixExpression covers non-reference atoms and grouped expressions (no `.prop` suffix here; use `MemberAccessExpression` for `name.prop`).
PostfixExpression infers Expression:
    '(' Expression ')' | StringTemplateExpression | NumberLiteral | ActionExpression;

// ObjectLiteral shares `{` `}` with `Block` — see invariant comment on `Block`.
ObjectLiteral:
    '{' properties+=ObjectProperty (',' properties+=ObjectProperty)* ','? '}';

ObjectProperty:
    name=ID value=(ObjectLiteral | Expression);

NumberLiteral:
    number=NUMBER;

// StringTemplateExpression is a `"…"` literal with optional `${ Expression }` interpolation holes. All strings
// (even without interpolation) parse as this single node; codegen collapses the trivial text-only case to a `Literal`.
// The multi-mode lexer (see `TaoTokenBuilder`) produces the synthetic terminals `STRING_START`, `STRING_END`,
// `INTERP_START`, `TEMPLATE_TEXT`. The placeholder patterns here are rewritten by the token builder.
// The closing `}` of `${…}` is the normal `'}'` keyword — in `interp` mode, `TaoTokenBuilder` emits a cloned
// variant (`CATEGORIES: ['}']`) with `POP_MODE`, so the parser accepts it and the lexer pops back to string mode.
StringTemplateExpression:
    STRING_START (segments+=StringTemplateSegment)* STRING_END;

StringTemplateSegment:
    text=TEMPLATE_TEXT
  | INTERP_START expression=(ObjectLiteral | Expression) '}';

// Terminals. Order matters!
////////////////////////////

hidden terminal WS: /\s+/;
// Block/line comments before other terminals so `/*` is not split into `/` and `*` (operator keywords).
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
terminal ID: /[_a-zA-Z][\w_]*/;

// Synthetic string-template terminals. These names are the contract with `TaoTokenBuilder`, which replaces their
// patterns and adds Chevrotain `PUSH_MODE` / `POP_MODE` directives to implement multi-mode lexing. The placeholder
// regex here are impossible to match so the default lexer would never produce them by accident.
terminal STRING_START:  /\u0000STRING_START\u0000/;
terminal STRING_END:    /\u0000STRING_END\u0000/;
terminal INTERP_START:  /\u0000INTERP_START\u0000/;
terminal TEMPLATE_TEXT: /\u0000TEMPLATE_TEXT\u0000/;

terminal NUMBER returns number: /[0-9]+/;
