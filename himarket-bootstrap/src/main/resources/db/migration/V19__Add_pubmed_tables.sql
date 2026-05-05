CREATE TABLE IF NOT EXISTS `pubmed_record` (
    `pmid` varchar(32) NOT NULL,
    `title` text DEFAULT NULL,
    `journal` varchar(512) DEFAULT NULL,
    `pub_date` varchar(128) DEFAULT NULL,
    `authors` json DEFAULT NULL,
    `doi` varchar(256) DEFAULT NULL,
    `abstract_text` longtext DEFAULT NULL,
    `created_at` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`pmid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pubmed_search` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `user_id` varchar(64) NOT NULL,
    `query_hash` varchar(64) NOT NULL,
    `query_text` text NOT NULL,
    `retmax` int NOT NULL,
    `total_count` bigint NOT NULL,
    `hit_count` bigint NOT NULL,
    `pmids` json NOT NULL,
    `created_at` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_pubmed_search_query_hash` (`query_hash`),
    KEY `idx_pubmed_search_user_created` (`user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
