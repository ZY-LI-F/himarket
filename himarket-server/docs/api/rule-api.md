# Rule API

> DEPRECATED: this document is retained only as a migration marker. Use
> `knowledge-api.md` for the current document review rule API.

The legacy rule-specific API has been replaced by the generic Knowledge API.
Document review rules are now represented as knowledge assets with:

| Field | Value |
| --- | --- |
| `kind` | `DocReviewRule` |
| `category` | `doc_review` |

See `knowledge-api.md` for the supported endpoints and request/response shape.

