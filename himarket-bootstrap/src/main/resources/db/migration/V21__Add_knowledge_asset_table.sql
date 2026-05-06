-- Knowledge asset table backing KnowledgeAsset entity (six-table knowledge platform).
-- Stores docclair rule + CSR/protocol authoring rules with scope/team/user inheritance,
-- payload validation via etag, and async MinIO yaml double-write tracking.

CREATE TABLE IF NOT EXISTS `knowledge_asset` (
    `id` varchar(64) NOT NULL,
    `api_version` varchar(64) NOT NULL DEFAULT 'hiclaw.io/v1beta2',
    `kind` varchar(64) NOT NULL,
    `category` varchar(64) NOT NULL,
    `name` varchar(128) NOT NULL,
    `scope` varchar(16) NOT NULL,
    `team_id` varchar(64) DEFAULT NULL,
    `user_id` varchar(64) DEFAULT NULL,
    `owner_id` varchar(64) NOT NULL,
    `inherits_from` varchar(64) DEFAULT NULL,
    `applicable_workers` json DEFAULT NULL,
    `severity` varchar(16) DEFAULT NULL,
    `domain` varchar(64) DEFAULT NULL,
    `description` text DEFAULT NULL,
    `payload` json NOT NULL,
    `enabled` tinyint(1) NOT NULL DEFAULT 1,
    `version` int NOT NULL DEFAULT 1,
    `etag` varchar(64) NOT NULL,
    `sync_pending` tinyint(1) NOT NULL DEFAULT 0,
    `last_synced_at` datetime(3) DEFAULT NULL,
    `deleted_at` datetime(3) DEFAULT NULL,
    `created_at` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_scope_team_user_name_category` (`scope`, `team_id`, `user_id`, `name`, `category`),
    KEY `idx_knowledge_asset_owner` (`owner_id`),
    KEY `idx_knowledge_asset_category_scope` (`category`, `scope`),
    KEY `idx_knowledge_asset_sync_pending` (`sync_pending`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
