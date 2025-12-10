set -e
# install just
echo "\n bootstrap: install command runner (just)..."
curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --force --to ~/.local/bin 2> /dev/null
echo " bootstrap: done"
echo " now, exec: '~/.local/bin/just setup'\n"

~/.local/bin/just setup
