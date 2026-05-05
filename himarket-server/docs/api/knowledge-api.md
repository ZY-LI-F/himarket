# Knowledge API

The Knowledge API manages reusable knowledge assets for document review rules.
It replaces the legacy rule-specific API document. Current callers should use
the generic knowledge asset endpoints below.

Base path: `/api/v1/admin/knowledge`

Authorization: caller must have `ADMIN` or `DEVELOPER` role.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/v1/admin/knowledge/schema` | Return the RJSF schema and UI schema for a supported knowledge payload. |
| POST | `/api/v1/admin/knowledge/validate` | Validate a knowledge payload without persisting it. |
| POST | `/api/v1/admin/knowledge` | Create a knowledge asset. |
| GET | `/api/v1/admin/knowledge` | List enabled knowledge assets by scope and category. |
| GET | `/api/v1/admin/knowledge/{id}` | Get one knowledge asset. |
| PUT | `/api/v1/admin/knowledge/{id}` | Update one knowledge asset. Requires `If-Match`. |
| DELETE | `/api/v1/admin/knowledge/{id}` | Soft-delete one knowledge asset. Requires `If-Match`. |

## Supported Schema

The current supported payload schema is:

| Field | Value |
| --- | --- |
| `kind` | `DocReviewRule` |
| `category` | `doc_review` |

`GET /api/v1/admin/knowledge/schema` accepts `kind` and `category` query
parameters and returns:

| Field | Type | Notes |
| --- | --- | --- |
| `category` | string | Echoes the supported category. |
| `kind` | string | Echoes the supported kind. |
| `schema` | object | JSON Schema draft 2020-12 for the asset form. |
| `uiSchema` | object | RJSF UI schema hints. |

## Save Request

`POST /api/v1/admin/knowledge` and `PUT /api/v1/admin/knowledge/{id}` accept the
same JSON body.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `kind` | string | yes | Currently `DocReviewRule`. |
| `category` | string | yes | Currently `doc_review`. |
| `name` | string | yes | Stable unique name within `scope`, `teamId`, `userId`, and `category`. |
| `scope` | string | yes | One of `global`, `team`, or `user`. |
| `teamId` | string | conditional | Required for `team` scope, forbidden otherwise. |
| `userId` | string | conditional | Required for `user` scope, forbidden otherwise. |
| `inheritsFrom` | string | no | Optional parent knowledge asset name. |
| `applicableWorkers` | string array | no | Workers that should consume this asset. |
| `severity` | string | no | Suggested values: `info`, `minor`, `major`, `critical`. |
| `domain` | string | no | Knowledge domain. |
| `description` | string | no | Human-readable description. |
| `payload` | object | yes | Payload validated against the selected schema. |
| `enabled` | boolean | no | Defaults to `true`. |

For `DocReviewRule`, `payload` must include:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `key` | string | yes | Rule key. |
| `condition` | string | yes | Rule condition. |
| `checks` | string array | yes | Checks enforced by the rule. |

## Concurrency

Updates and deletes use optimistic concurrency.

| Header | Required | Notes |
| --- | --- | --- |
| `If-Match` | yes for `PUT` and `DELETE` | Must match the current asset `etag`; quoted and unquoted values are accepted. |

When the header is missing or stale, the service returns `412 PRECONDITION_FAILED`.

## Response Shape

Create, get, list, update, and delete return `KnowledgeAsset` objects. Important
fields include:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Server-generated id, prefixed with `knowledge-`. |
| `apiVersion` | string | Current persisted API version. |
| `kind` | string | Knowledge asset kind. |
| `category` | string | Knowledge asset category. |
| `name` | string | Stable asset name. |
| `scope` | string | `global`, `team`, or `user`. |
| `teamId` | string | Present for team-scoped assets. |
| `userId` | string | Present for user-scoped assets. |
| `ownerId` | string | User id that created the asset. |
| `inheritsFrom` | string | Optional parent knowledge asset name. |
| `applicableWorkers` | string array | Worker ids that should consume this asset. |
| `severity` | string | Optional severity. |
| `domain` | string | Optional domain. |
| `description` | string | Optional description. |
| `payload` | object | Validated payload. |
| `enabled` | boolean | Whether the asset is active. |
| `version` | integer | Incremented on update and delete. |
| `etag` | string | Optimistic concurrency token. |
| `syncPending` | boolean | Whether the asset still needs downstream sync. |
| `lastSyncedAt` | string | Last successful sync timestamp, when available. |
| `deletedAt` | string | Soft-delete timestamp, when available. |
| `createAt` | string | Creation timestamp. |
| `updatedAt` | string | Last update timestamp. |

