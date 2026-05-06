-- Glossary table backing Glossary entity.
-- Stores cross-domain term/translation/aliases used by csr_review + protocol_authoring workers.

CREATE TABLE IF NOT EXISTS `glossary` (
    `glossary_id` varchar(64) NOT NULL,
    `term` varchar(128) NOT NULL,
    `translation` varchar(128) DEFAULT NULL,
    `aliases` json DEFAULT NULL,
    `description` text DEFAULT NULL,
    `enabled` tinyint(1) NOT NULL DEFAULT 1,
    `created_at` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`glossary_id`),
    UNIQUE KEY `uk_glossary_term` (`term`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
