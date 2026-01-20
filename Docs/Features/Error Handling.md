# Tao Lang Error Handling

## Syntax: WIP

Syntactic error supports to consider:

case File.read("example.txt") do
{:ok, content} -> content
{:error, reason} -> {:error, {:read_failed, reason}}
end

- Error wrapping
  - Python: `raise RuntimeError("Failed to read file") from e`
  - Elixir: `{:error, reason} -> {:error, {:read_failed, reason}}`
- Regardless-of handling
  - Go: `defer f.Close()`
  - Java: `finally { f.close() }`
- Error declaration
  - Swift: `func load(path: String) throws -> String { ... }`
- Error propagation
  - Swift: `try String(contentsOfFile: path)`
- Explicit result/error wrappers, e.g `Result<String>`
  - C3: `var res = foo(); res.is_error() && io::print(res.error());`

## Examples from other languages

### Multiple return values - Go

- Errors are values
- Errors are not required to be handled
- `defer` allows for regardless-of handling

```go
func readFile(path string) (string, error) {
    f, err := os.Open(path)
    if err != nil {
        return "", fmt.Errorf("failed to open file: %w", err)
    }
    defer f.Close()
    return io.ReadAll(f)
}
```

### Try/catch - Java, Python

- Errors interrupt execution flow

```python
try:
    with open("example.txt", "r") as file:
        return file.read()
except OSError as e:
    raise RuntimeError("Failed to read file") from e
```

Java:

- Functions must declare exceptions they can throw
- Callers must handle all exceptions, or declare they might throw them
  - (Very verbose)
- `finally` allows for regardless-of handling

```java
try (var in = Files.newBufferedReader(Path.of("example.txt"))) {
    return in.readLine();
} catch (IOException e) {
    throw new RuntimeException("Failed to read file", e);
} finally {
    // 
}
```

### Generic wrappers

All errors are result wrappers (like e.g C3's Result type):

```c3
fn read_file(String path) -> Result<String> {
    if (!exists(path)) return error("File not found");
    return ok(load(path));
}

fn example_usage() {
    var result = read_file("example.txt");
    if (result.is_error()) {
        io::print(result.error());
    }
}
```

### Pattern matching - Elixir

```elixir
case File.read("example.txt") do
    {:ok, content} -> content
    {:error, reason} -> {:error, {:read_failed, reason}}
end
```

#### Error Unions - Zig

`(!T)` means "either error or T":

```zig
fn read_file(path: []const u8) ![]const u8 {
    return try std.fs.readFile(path);
}
```

Handle errors explicitly with `try`:

```zig
const data = load(allocator) catch |err| {
    return;
};
defer allocator.free(data);
```
