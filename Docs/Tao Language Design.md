# Tao Language Design

## Data Description

Data is described with **declarative schemas** (entities, relationships, and where they are fetched), separate from UI. Views consume **typed** values produced by queries; async behavior is explicit (e.g. `Loadable`-shaped results in the intended design).

**Authoritative design (current preferred + alternatives + prior art + runtime notes):** see **[Queries Design - Preferred.md](Projects/Data%20Schema%20and%20Queries/Process%20Docs/Queries%20Design%20-%20Preferred.md)** in _Projects/Data Schema and Queries_, with **[Queries Design - Alternatives.md](Projects/Data%20Schema%20and%20Queries/Process%20Docs/Queries%20Design%20-%20Alternatives.md)** for forks not duplicated in the preferred doc.

The sketch below is **historical / illustrative** only (older `model` / `Text` shape); it does **not** match the preferred `Tasks Task` / `X is Y` schema style in the linked project docs.

```tao
data MyBlog {
    source graphql {
        uri https://api.example.com/graphql
        subscriptions wss://api.example.com/graphql-subscriptions
        cache in-memory
    }
    auth http {
        http-header Authorization
        model Person
    }
    model Person {
        name Text
        friends [Person]
        posts [Post]
    }
    model Post {
        author Person
        title Text
        body Text
        comments [Comment]
    }
    model Comment {
        post Post
        author Person
        text Text
    }
}
```

## Authentication

```tao
session {
    User Person
}
```

## UI Themes

```tao
theme MyBlog {
    spacing default {
        thin 4px
    }
    spacing narrow {
        when screen.width < 600px
        thin 2px
    }
    spacing wide {
        when screen.width > 1000px
        thin 8px
    }

    variations {
        narrow {
            unit = 2px
        }
        wide {
            unit = 4px
        }
    }
}
```

## UI Views

```tao
view UserPosts {
    Col [pad thin] {
        List User.posts {
            render Post {

        }
    }

    }
}
```
