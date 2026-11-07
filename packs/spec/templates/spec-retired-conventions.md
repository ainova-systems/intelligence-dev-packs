# Retired conventions (schema)

> Optional. A project rule in this shape lists the ways of building that the code itself has retired,
> so a plan's `Precedents:` (`spec-plan`) never copies one and a review can name the replacement.
> `spec-init` drafts it when the code carries deprecation marks; the project keeps it in its own rules
> source, scoped to the paths the entries live under.

## The bar for an entry

An entry comes only from the code: a deprecation mark (`@deprecated` or the stack's equivalent) on a
class, function, component or pattern whose replacement exists in the tree today. A mark with no
replacement, a pattern someone dislikes, or a plan to retire something later is not an entry. When
the mark's own pointer names a replacement that does not exist, the entry names the real one, or is
left out.

## Entries

- **<the retired thing, by path and name>** - use **<the replacement, by path and name>** instead.
  - *Evidence*: <the deprecation mark, by path>

### Example shape

- **`src/billing/LegacyInvoiceBuilder`** - use **`src/billing/invoices/InvoiceFactory`** instead.
  - *Evidence*: `@deprecated` on `LegacyInvoiceBuilder`, naming `InvoiceFactory`.
