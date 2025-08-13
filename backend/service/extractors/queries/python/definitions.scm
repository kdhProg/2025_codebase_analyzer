; Function Definitions
(function_definition
  name: (identifier) @function.name)
(decorated_definition
  definition: (function_definition
    name: (identifier) @function.name))

; Class Definitions
(class_definition
  name: (identifier) @class.name)

; Call Expressions
(call  ; <-- 이 부분을 'call_expression'에서 'call'로 수정했습니다.
  function: (identifier) @call.target.name)
(call  ; <-- 이 부분을 'call_expression'에서 'call'로 수정했습니다.
  function: (attribute
    attribute: (identifier) @call.target.name))

; Imports
(import_statement
  (dotted_name) @import.module)
(import_from_statement
  module_name: (dotted_name) @import.module
  name: (dotted_name) @import.name)
(import_from_statement
  module_name: (dotted_name) @import.module
  (wildcard_import) @import.wildcard)

; Variable Assignments
(assignment
  left: (identifier) @variable.name)
