CREATE TABLE IF NOT EXISTS `writing_project` (
    `id` varchar(64) NOT NULL,
    `title` varchar(255) NOT NULL,
    `spec` varchar(64) NOT NULL,
    `version` varchar(64) NOT NULL,
    `room_id` varchar(128) DEFAULT NULL,
    `team_template_id` varchar(128) DEFAULT NULL,
    `prompt` longtext DEFAULT NULL,
    `status` varchar(32) NOT NULL DEFAULT 'draft',
    `chapters` json NOT NULL,
    `assembled_document` longtext DEFAULT NULL,
    `last_task_id` varchar(128) DEFAULT NULL,
    `last_dispatched_at` datetime(3) DEFAULT NULL,
    `created_at` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    KEY `idx_writing_project_spec_version` (`spec`, `version`),
    KEY `idx_writing_project_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
