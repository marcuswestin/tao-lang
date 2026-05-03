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

# Allow when ./agent / bash ./agent is first, or after "cd ... &&" (with optional bash before ./agent).
# Recipes are defined in agent.Justfile.
if_command_lacks "^(\./agent |bash[[:space:]]+\./agent |cd[[:space:]]+.+&&[[:space:]]*(\./agent |bash[[:space:]]+\./agent ))" \
  && halt_command "Only agent commands are allowed. Use ./agent <cmd>. See ./agent help"

echo '{"permission": "allow"}'
