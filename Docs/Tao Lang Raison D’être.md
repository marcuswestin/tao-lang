# Why Tao

## Raison D’être

### Today: The Status Quo

Today, building an app with a user interface involves complexity that has little to do with the app's purpose. The list of difficulties to manage [is long](#common-difficultues).

### Tao's Thesis

Tao posits that these challenges arise from the general purpose programming languages that we use to write apps. Swift, Kotlin, TypeScript, etc were designed to tackle _any_ computational tasks. However, UI app implementation is a domain specific programmatic challenge, and it deserves a domain specific language.

### Tao's M.O.

Tao restricts the app designer and engineer to an efficient, elegant, and comprehensible set of possible expressions, custom designed for the core responsibilities of app creation:

- Visual design, testing, and iteration
- Data description/fetching/caching/transformation
- Declaring how data state maps to visual elements
- Layout and styling of visualized element, across various devices
- Updating the app and its data in response to actions and events

Each one of these core responsibilities has its own syntax, which empowers efficient and correct expression of the maker's intentions, while eliminating the possibility of most unintended errors.

## References

### Common Difficultues

- Data fetching and caching
- UI Layout (across many different platforms and screen dimensions)
- Error state handling
- Internationalization
- Testing
- Usage tracking
- Bug reporting and debugging
