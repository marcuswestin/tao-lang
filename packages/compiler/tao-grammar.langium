grammar TaoLang

entry TaoFile:
    topLevelStatements += TopLevelStatement*;

TopLevelStatement:
    Declaration;

Declaration:
    ( type='app' name=ID '{' appStatements += AppStatement* '}'
    | type='view' name=ID '{' viewStatements += ViewStatement* '}'
    );

// App declaration
//////////////////

AppStatement:
    AppRootDeclaration;

AppRootDeclaration:
    type='root' name=ID;

// View declaration
///////////////////

ViewStatement:
    ViewRenderStatement;

ViewRenderStatement:
    viewDeclaration=[Declaration:ID] value=STRING;


hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;
// terminal INT returns number: /[0-9]+/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
