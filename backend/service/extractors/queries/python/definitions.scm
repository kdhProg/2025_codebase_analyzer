; Function Definition: Captures the entire function definition node and its name.
(function_definition
  name: (identifier) @function.name
  body: (block) @function.body
) @function.definition

; Decorated Function Definition: Captures functions wrapped in a decorator.
(decorated_definition
  definition: (function_definition
    name: (identifier) @function.name
    body: (block) @function.body
  )
) @function.definition

; Class Definition: Captures the entire class definition node and its name.
(class_definition
  name: (identifier) @class.name
  body: (block) @class.body
) @class.definition

; Call Expression: Captures the call expression node and the function/method being called.
(call
  function: (identifier) @call.target.name
) @call.expression

; Attribute access for method calls (e.g., obj.method())
(call
  function: (attribute
    object: (_)
    attribute: (identifier) @call.target.name
  )
) @call.expression.attribute

; Import statement: Captures imported modules (e.g., import os)
(import_statement
  (dotted_name) @import.module
) @import.statement

; From-import statement: Captures module and imported names (e.g., from X import Y)
(import_from_statement
  module_name: (dotted_name) @import.module ; Module name after 'from' (e.g., 'fastapi', 'fastapi.middleware.cors', 'api')

  ;; The imported items can be one of three types.
  ;; The 'name:' field is explicitly present in the Playground AST, so it's included.
  ;; '?' indicates optional (0 or 1 occurrence).
  [
    name: (dotted_name) @import.name           ; Captures individual imported names (e.g., 'FastAPI', 'CORSMiddleware', 'file_scan')
    (wildcard_import) @import.wildcard          ; Captures 'import *' (e.g., 'from my_module import *')
    (aliased_import                            ; Captures 'from X import Y as Z'
      name: (dotted_name) @import.name_original
      alias: (identifier) @import.alias
    )
  ]? ; This entire block might be optional

  ;; Alternatively, if an 'import_list' or similar intermediate node exists in the AST,
  ;; you might wrap the items inside it like this:
  ;; (import_list
  ;;   [
  ;;     (dotted_name) @import.name
  ;;     (aliased_import ...)
  ;;   ]*
  ;; )?

) @import.statement.from

; Variable Assignment: Capture simple variable assignments (e.g., app = FastAPI(), origins = [...])
(assignment
  left: (identifier) @variable.name
  right: (_) @variable.value
) @variable.assignment