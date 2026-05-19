grammar TaoLang

entry TaoFile:
    statements += Statement*;

Statement: Declaration | ModuleDeclaration | UseStatement | Debugger | Injection | RenderStatement | ViewRender | ChildrenSplice | ActionRender | StateUpdate
    | NavigationActionStatement | QueryDeclaration | GuardStatement | ForStatement | CreateStatement;



// Shared Types
///////////////

type Referenceable = Declaration | VariantDeclaration | ParameterDeclaration | QueryDeclaration | ForStatement;

type ScopeRelevantNode = UseStatement | Declaration | VariantDeclaration | AppDeclaration | ParameterDeclaration | DataEntityDeclaration | DataTypeDeclaration | QueryDeclaration | ForStatement;

// ViewFragmentStatement groups view-ordered body items handled by `viewFragmentStatement` codegen (exhaustive switch); not every `Statement` is a fragment statement.
type ViewFragmentStatement = RenderStatement | ViewRender | ChildrenSplice | Injection | ForStatement | Debugger | QueryDeclaration | GuardStatement | Declaration;
type ViewStatement = RenderStatement | ViewRender | ChildrenSplice | Injection | AssignmentDeclaration | BlockDeclaration | Debugger | QueryDeclaration | GuardStatement | ForStatement;
type TopLevelStatement = Declaration | UseStatement | Injection | Debugger | QueryDeclaration;
type ActionStatement = StateUpdate | Injection | Debugger | AssignmentDeclaration | BlockDeclaration | ActionRender | NavigationActionStatement | CreateStatement;

// ArgumentListHost groups the call-site nodes that own an `ArgumentList`. Generic argument-binding logic
// (see `tao-argument-bindings.ts`) keys off this union, so adding a new host kind (e.g. function calls)
// only requires extending this type and the resolver's callee dispatch.
type ArgumentListHost = RenderStatement | ViewRender | ActionRender;

// Shared Statements
////////////////////

RuntimeDeclaration: AppDeclaration | NavigatorDeclaration | AssignmentDeclaration | BlockDeclaration;
Declaration: RuntimeDeclaration | VariantDeclaration | TypeDeclaration | DataDeclaration;

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
    AppUiStatement | AppNavigationStatement | AppProviderStatement | AppDesignBlock | OnStatement;

AppDesignBlock:
    'design' '{' description=AppDesignDescription '}';

AppDesignDescription:
    'description' value=StringTemplateExpression;

AppUiStatement:
    'ui' ui=[Referenceable:ID];

AppNavigationStatement:
    'navigation' navigation=[Referenceable:ID];

AppProviderStatement:
    'provider' provider=ID '{' properties+=AppProviderProperty* '}';

AppProviderProperty:
    name=ID value=StringTemplateExpression;

OnStatement:
    'on' event=ID handler=ActionExpression;

// Data Schema
//////////////

// `data Name { … }` declares a schema with data-scoped types and entity declarations.
// Wired into `Declaration` so it inherits module visibility, duplicate-name, and uppercase checks.
DataDeclaration:
    'data' name=ID '{' dataStatements+=DataStatement* '}';

DataStatement: DataTypeDeclaration | DataEntityDeclaration;

// Data-scoped type alias, e.g. `type Status is text`. Shares shape with top-level `TypeDeclaration`
// but lives inside a `data` block and resolves within that scope.
DataTypeDeclaration:
    'type' name=ID 'is' base=TypeReference;

// Entity declaration: `Plural Singular { fields… }`. `pluralName` is the collection name (e.g. `Events`),
// `name` is the singular (e.g. `Event`) and serves as the referenceable identifier.
DataEntityDeclaration:
    pluralName=ID name=ID '{' (fields+=DataFieldDeclaration (',' fields+=DataFieldDeclaration)* ','?)? '}';

QueryDeclaration:
    'query' schema=[DataDeclaration:ID] '.' target=[DataEntityDeclaration:ID] ('as' name=ID)? (selection=QuerySelectionBlock)?;

QuerySelectionBlock:
    '{' (entries+=QuerySelectionEntry (',' entries+=QuerySelectionEntry)* ','?)? '}';

QuerySelectionEntry:
    path=QueryFieldPath ((op=QueryComparisonOperator value=Expression) | selection=QuerySelectionBlock)?;

QueryComparisonOperator returns string:
    '=' | '!=' | '<=' | '>=' | '<' | '>';

QueryFieldPath:
    segments+=ID ('.' segments+=ID)*;

GuardStatement:
    'guard' block=Block;

ForStatement:
    'for' name=ID 'in' collection=[Referenceable:ID] block=Block;

CreateStatement:
    'create' schema=[DataDeclaration:ID] '.' entity=[DataEntityDeclaration:ID]
    '{' (fields+=CreateFieldAssignment (',' fields+=CreateFieldAssignment)* ','?)? '}';

CreateFieldAssignment:
    field=ID value=Expression?;

// Field inside an entity. When `type` is absent, it's a shorthand field: `Event,` means name equals type.
DataFieldDeclaration:
    name=ID (type=DataFieldType)? metadata+=DataFieldMetadata*;

// Field type: primitive (`text`, `number`), named reference to an entity/type, or `[Entity]` for to-many.
// References use `DataFieldTarget` so they resolve to entities and data-scoped types within the same
// `data` block, as well as top-level declarations.
DataFieldType:
    primitiveType=PrimitiveType | '[' arrayRef=[DataFieldTarget:ID] ']' | namedRef=[DataFieldTarget:ID];

DataFieldMetadata:
    kind=DataFieldMetadataKind (value=Expression)?;

DataFieldMetadataKind returns string: 'optional' | 'unique' | 'indexed' | 'default';

// Cross-reference target for data field types: entities and data-scoped types within the same
// `data` block, plus top-level declarations (for referencing types declared outside the data block).
type DataFieldTarget = Declaration | DataEntityDeclaration | DataTypeDeclaration;

DeclarationVisibility returns string: 'hide' | 'share' | 'module';
ModuleDeclaration:
    visibility=DeclarationVisibility declaration=Declaration;


// Declarations
///////////////

BlockDeclaration: ViewDeclaration | ActionDeclaration;

ViewDeclaration: type=ViewDeclarationKind name=ID parameterList=ParameterList? designSpec=DesignSpec? layoutClause=LayoutClause? block=Block;
ViewDeclarationKind returns string: 'ui' | 'frame' | 'layout';
ActionDeclaration: type='action' name=ID parameterList=ParameterList? block=Block;
VariantDeclaration: 'variant' name=ID '=' target=[Referenceable:ID] designSpec=DesignSpec?;
DesignSpec: '<' description=StringTemplateExpression '>';


// Navigation
/////////////

NavigatorDeclaration:
    'navigator' name=ID '{' body=NavigatorBody '}';

NavigatorBody:
    StackNavigator | TabsNavigator;

StackNavigator:
    'stack' '{' destinations+=StackDestination* '}';

TabsNavigator:
    'tabs' '{' destinations+=TabDestination* '}';

StackDestination:
    'screen' name=ID target=ID? options=NavigationDestinationOptions?;

TabDestination:
    'tab' name=ID target=ID? options=NavigationDestinationOptions?;

NavigationDestinationOptions:
    '{' options+=NavigationDestinationOption* '}';

NavigationDestinationOption:
    NavigationTitleOption | NavigationIconOption | NavigationPathOption | NavigationParamDeclaration;

NavigationTitleOption:
    'title' value=StringTemplateExpression;

NavigationIconOption:
    'icon' source=NavigationIconSource name=ID;

NavigationIconSource returns string:
    'system';

NavigationPathOption:
    'path' value=StringTemplateExpression;

NavigationParamDeclaration:
    'param' name=ID type=NavigationParamType;

NavigationParamType returns string:
    'text' | 'number' | 'boolean';


// View-only statements
///////////////////////

RenderStatement:
    'render' (injection=Injection | view=[Declaration:ID] argumentList=ArgumentList? layoutClause=LayoutClause? block=Block?);

ViewRender:
    view=[Declaration:ID] argumentList=ArgumentList? layoutClause=LayoutClause? block=Block?;
ChildrenSplice:
    type='@@children';
type RenderNode = RenderStatement | ViewRender | ChildrenSplice | Injection;

// View Layout specs
////////////////////

LayoutClause:
    '[' (entries+=LayoutEntry (',' entries+=LayoutEntry)* )? ','? ']';

LayoutEntry:
    terms+=LayoutTerm+;

LayoutTerm:
    LayoutWord | LayoutPercentLiteral | LayoutNumberLiteral;

LayoutWord:
    value=ID | value=('spread-inset' | 'spread-balanced');

LayoutNumberLiteral:
    negative?='-'? value=NUMBER;

LayoutPercentLiteral:
    negative?='-'? value=NUMBER '%';

// Action-only statements
/////////////////////////

StateUpdateOperator returns string: '=' | '+=' | '-=' | '*=' | '/='
;
StateUpdate:
    'set' target=MemberAccessExpression operator=StateUpdateOperator value=Expression;

// Invocation of a declared action from inside another action body, e.g.
// `do LogEvent Message "submitted", Level "info"`. The leading `do` keyword
// disambiguates from `ViewRender` (same `Name Arg val …` shape but different
// callee kind). The callee cross-ref is restricted to `ActionDeclaration` so
// `do Bump .Step 3` parses as `do Bump` with a dot-local typed argument (not a
// qualified callee path). Optional `block` mirrors `ViewRender` for nested
// action statements after the call.
ActionRender:
    'do' action=[ActionDeclaration:ID] argumentList=ArgumentList? block=Block?;

NavigationActionStatement:
    NavigationPushAction | NavigationPopAction | NavigationTabAction;

NavigationPushAction:
    'navigation' action='push' target=ID payload=NavigationActionPayload?;

NavigationPopAction:
    'navigation' action='pop';

NavigationTabAction:
    'navigation' action='tab' target=ID payload=NavigationActionPayload?;

NavigationActionPayload:
    '{' assignments+=NavigationActionParamAssignment* '}';

NavigationActionParamAssignment:
    name=ID value=Expression?;

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
    '(' Expression ')' | StringTemplateExpression | NumberLiteral | BooleanLiteral | NullLiteral | ActionExpression;

// ObjectLiteral shares `{` `}` with `Block` — see invariant comment on `Block`.
ObjectLiteral:
    '{' properties+=ObjectProperty (',' properties+=ObjectProperty)* ','? '}';

ObjectProperty:
    name=ID value=(ObjectLiteral | Expression);

NumberLiteral:
    number=NUMBER;

BooleanLiteral:
    value=BooleanLiteralValue;

BooleanLiteralValue returns string:
    'true' | 'false';

NullLiteral:
    value='null';

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
