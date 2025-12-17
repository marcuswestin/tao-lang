# Process Filtering
###################

PS_FILTER_LIBRARY := "(Library/Apple/System)"
PS_FILTER_SYSTEM := "(System/(Library|Volumes|iOSSupport|Cryptexes))"
PS_FILTER_USR := "(usr/(sbin|libexec))"
PS_UNMATCHABLE_REGEX := "$^"
PS_FILTER_COMMON_SYSTEM := '"/Library/Developer/CoreSimulator/" "/System/Library/"'
PS_FILTER_COMMON_USER := '"/Applications/" "Cursor Helper"'
PS_FILTER_COMMON_MISC := '"/bin/node$" "aslmanager$" " assetsd$"'

# Grep my relevant processes
psgrep *PATTERN:
    just _ps-filter | grep {{ PATTERN }}

# Print my most relevant processes, with a filter
psrelevant *FILTERS:
    just _ps-filter \
        {{ PS_FILTER_COMMON_SYSTEM }} \
        {{ PS_FILTER_COMMON_USER }} \
        {{ PS_FILTER_COMMON_MISC }} \
        {{ FILTERS }}

# Print my relevant processes, with a filter
ps *FILTERS:
    just _ps-filter {{ FILTERS }}

# Print my processes, with a filter
[positional-arguments]
_ps-filter *FILTERS:
    #!/bin/bash
    max_pid=$(ps -axo pid | sort -rn | head -1)
    # Create arguments regex, or default to unmatchable regex
    regex=$(IFS='|'; echo "${*:-{{ PS_UNMATCHABLE_REGEX }}}")
    ps -eo user,pid,ppid,args,comm \
        | awk '{ pid=$2; ppid=$3 } pid > 1000 && ppid != 1' \
        | awk -v max_pid="$max_pid" 'pid < max_pid' \
        | grep -vE "^\w+(\d\s)+ /{{ PS_FILTER_LIBRARY }}|{{ PS_FILTER_SYSTEM }}|{{ PS_FILTER_USR }}/" \
        | grep -vE "$regex" \
        | sort -k 2 -n \
        || true;
