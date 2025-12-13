#!/bin/bash
# allowlist.sh - receives JSON input from Cursor

# Read input from stdin
input=$(cat)
command=$(echo "$input" | jq -r '.command')

# Block dangerous patterns
if echo "$command" | grep --invert-match --quiet "^just "; then
  echo '{"allow": false, "message": "Only `just <command>` commands are allowed"}'
  exit 1
fi

if echo "$command" | grep --quiet "git commit" | grep --invert-match --quiet "just pre-commit"; then
  echo '{"allow": false, "message": "You must run `just pre-commit && git commit ...` to commit your changes"}'
  exit 1
fi

echo '{"allow": true}'
