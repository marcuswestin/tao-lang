> **Layout Decisions So Far**
>
> - Tao uses `items` as the only parent-child alignment/distribution keyword.
> - `Row [items ...]` and `Col [items ...]` accept order-insensitive visual intent tokens.
> - Runtime layout translation resolves `items` using the container’s flex direction.
> - Physical tokens:
>   - `top` / `bottom` claim vertical.
>   - `left` / `right` claim horizontal.
>   - `baseline` claims vertical and is valid only for `Row`.
> - `center` fills whichever slot is still open:
>   - `center` alone means `center center`.
>   - `center left` means vertical center + horizontal left.
>   - `center top` means vertical top + horizontal center.
> - Container-dependent tokens:
>   - In `Row`, `stretch` claims vertical.
>   - In `Row`, `spread*` claims horizontal.
>   - In `Col`, `stretch` claims horizontal.
>   - In `Col`, `spread*` claims vertical.
> - Defaults:
>   - `Row` defaults to `items bottom left`.
>   - `Col` defaults to `items top stretch`.
> - Single-token forms fill the other slot from container defaults:
>   - `Row [items spread]` -> `bottom spread`.
>   - `Row [items stretch]` -> `stretch left`.
>   - `Col [items spread]` -> `spread stretch`.
>   - `Col [items stretch]` -> `top stretch`.
> - Conflicting claims to the same resolved slot produce warnings.
> - Production does not compile with warnings.
> - Extra/conflicting `center` after both slots are already filled is an error.
> - Spread names are fixed:
>   - `spread` = `space-between`.
>   - `spread-hug` = `space-around`.
>   - `spread-hug-tight` = `space-evenly`.
