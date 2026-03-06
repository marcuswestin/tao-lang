#!/bin/bash
# allowlist.sh - receives JSON input from Cursor

# Read input from stdin
input=$(cat)
command=$(echo "$input" | jq -r '.command')

# checks if the command contains something
function if_command_contains() {
  local string="$1"
  if ! echo "$command" | grep --quiet "$string"; then
    return true
  fi
}

# checks if the command does not contain something
function if_without_command() {
  local string="$1"
  if echo "$command" | grep --quiet --invert-match "$string"; then
    return true
  fi
}

# halts a command instead of exectuing
function halt_command() {
  local message="$1"
  echo '{"allow": false, "message": "'$message'"}'
  exit 1
}

if_command_lacks "^just " \
  && halt_command "Only 'just <command>' commands are allowed"

if_command_contains "git commit" \
  && if_command_lacks "git pre-commit" \
  && halt_command "You must run `just pre-commit && git commit ...` to commit your changes"

if_command_contains "git push" \
  && halt_command "git push is not allowed"

echo '{"allow": true}'
