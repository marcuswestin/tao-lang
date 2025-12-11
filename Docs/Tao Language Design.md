# Tao Language Design

## Data Description

Data is described with declarative schemas that describe entities (like Person, Post, and Comment), their relationships (e.g a Person's friends, a Post's author, a Post's Comments, a Comment's Author, and so on), and where to fetch it.

Tao then takes care of fetching required data, updating the app when someone changes data, and allowing for simple manipulation of the data:

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
