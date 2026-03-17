#!/bin/bash
# allowlist.sh - receives JSON input from Cursor

# Read input from stdin
input=$(cat)
command=$(echo "$input" | jq -r '.command')

# returns 0 if command does not match pattern (command "lacks" the pattern)
function if_command_lacks() {
  local pattern="$1"
  if ! echo "$command" | grep --quiet -E "$pattern"; then
    return 0
  fi
  return 1
}

# halts a command instead of executing; Cursor expects permission + optional messages
function halt_command() {
  local message="$1"
  echo "{\"permission\": \"deny\", \"user_message\": \"$message\", \"agent_message\": \"$message\"}"
  exit 2
}

# Allow when ./just-agents is first, or when Cursor runs "cd <dir> && ./just-agents ..." (so $4 is ./just-agents).
# Recipes are defined in just-agents.Justfile.
if_command_lacks "^(\./just-agents |cd[[:space:]]+.+&&[[:space:]]*\./just-agents )" \
  && halt_command "Only agent commands are allowed. Use ./just-agents <cmd>. See ./just-agents help"

echo '{"permission": "allow"}'
