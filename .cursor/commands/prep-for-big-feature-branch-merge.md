It's time to tidy up and wrap up the work done in this branch. In order I'd like to do something like:

- Review what's changed, and think through whether any of the changes can be improved. Note it down for later.
- Consider what the logical next three feature branches should be.
- Make a plan for what needs to be cleaned up among the new changes. Let's get it is squeeky clean and ready to be merged:
  - Run `just fix` and `just check` to ensure everything is clean.
  - Fix all documentation:
    - comments are prefixed with "//" instead of "/** */"
    - and start with "<Function/Variable/Class name> <does/gives/provides etc description>"
      - e.g "saveLocalScopeSymbol determines which local scope symbols to make available for the current scope context".
  - Look for new code to DRY up.
  - Look at new function and definition names, and ensure they are descriptive and concise.
  - Ensure that all new language functionality has:
    - Validation
    - Compilation
    - Tests: Parsing; Validation; Runtime;
- Write down this plan in the appropriate `./TODO Specs/<name>/COMPLETION-SUMMARY.md` folder.
- Review the plan, and get approval to commit it.
