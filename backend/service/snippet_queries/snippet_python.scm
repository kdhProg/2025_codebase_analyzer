; Function bodies as snippets
(function_definition
  body: (block) @code_snippet)

; Class bodies as snippets
(class_definition
  body: (block) @code_snippet)

; Top-level code blocks as snippets
(module
  (expression_statement) @code_snippet)