# Formatter

`tao fmt` formats all .tao files in one canonical style.

## Overview

The Tao formatter automatically formats your code to a standard style:

- **Consistency**: All Tao files look the same, making codebases easier to read and maintain
- **No debates**: There's one canonical way to format code, eliminating style discussions
- **Automatic**: Format on save or via command, no manual formatting needed

## Usage

### In Your IDE

The formatter is automatically available from the IDE extension. Just enable "Format on Save" in your settings.json:

```json
{
  "editor.formatOnSave": true,
  "[tao]": {
    "editor.defaultFormatter": "tao.tao-lang-vscode-extension"
  }
}
```

### Command Line

Use the Tao CLI to format files:

```bash
tao fmt path/to/file.tao # just this file
tao fmt src/ # all files in the directory
tao fmt **/tests/*.tao # all .tao files in tests directories
tao fmt # all files in the current directory
```

## Configuration

The formatter uses a fixed, canonical style. There are no configuration options - this ensures all Tao code looks the same everywhere.
