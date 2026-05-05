-- Add generic attachment table for MinIO-backed uploads with sha256 deduplication.

START TRANSACTION;

CREATE TABLE IF NOT EXISTS `attachment` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `attachment_id` varchar(64) NOT NULL,
    `name` varchar(255) NOT NULL,
    `content_type` varchar(128) NOT NULL,
    `size_bytes` bigint NOT NULL,
    `sha256` varchar(64) NOT NULL,
    `object_name` varchar(512) NOT NULL,
    `created_at` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_attachment_id` (`attachment_id`),
    UNIQUE KEY `uk_attachment_sha256` (`sha256`),
    UNIQUE KEY `uk_attachment_object_name` (`object_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;
