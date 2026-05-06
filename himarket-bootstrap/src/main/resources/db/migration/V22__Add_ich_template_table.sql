-- ICH template baseline table backing IchTemplate entity.
-- Seeded from classpath ich-baseline/**/*.yaml at startup for E3 / E6-R3 / E8-R1 / E9 / E2A.

CREATE TABLE IF NOT EXISTS `ich_template` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `spec` varchar(64) NOT NULL,
    `version` varchar(64) NOT NULL,
    `section_path` varchar(128) NOT NULL,
    `section_order` int NOT NULL,
    `title` varchar(255) DEFAULT NULL,
    `outline` longtext NOT NULL,
    `source_path` varchar(512) NOT NULL,
    `created_at` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_spec_section_version` (`spec`, `section_path`, `version`),
    KEY `idx_ich_template_spec_version_order` (`spec`, `version`, `section_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
