CREATE TABLE IF NOT EXISTS `agent_workspace` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `workspace_uid` varchar(64) NOT NULL,
    `tenant_id` varchar(64) NOT NULL,
    `owner_id` varchar(64) NOT NULL,
    `name` varchar(128) NOT NULL,
    `description` varchar(512) DEFAULT NULL,
    `default_team_template_id` varchar(64) DEFAULT NULL,
    `is_active` tinyint(1) NOT NULL DEFAULT 0,
    `created_at` datetime NOT NULL,
    `updated_at` datetime NOT NULL,
    `deleted_at` datetime DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_agent_workspace_uid` (`workspace_uid`),
    KEY `idx_aw_tenant` (`tenant_id`, `deleted_at`),
    KEY `idx_aw_owner` (`owner_id`, `deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `agent_room` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `room_uid` varchar(64) NOT NULL,
    `workspace_uid` varchar(64) NOT NULL,
    `tenant_id` varchar(64) NOT NULL,
    `name` varchar(128) NOT NULL,
    `model_id` varchar(64) DEFAULT NULL,
    `team_template_id` varchar(64) DEFAULT NULL,
    `file_root` varchar(256) DEFAULT NULL,
    `permission_json` text DEFAULT NULL,
    `created_at` datetime NOT NULL,
    `updated_at` datetime NOT NULL,
    `deleted_at` datetime DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_agent_room_uid` (`room_uid`),
    KEY `idx_ar_ws` (`workspace_uid`, `deleted_at`),
    KEY `idx_ar_tenant` (`tenant_id`, `deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `agent_room_config` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `room_uid` varchar(64) NOT NULL,
    `config_json` longtext NOT NULL,
    `version` bigint NOT NULL DEFAULT 1,
    `updated_at` datetime NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_agent_room_config_room_uid` (`room_uid`),
    KEY `idx_arc_room` (`room_uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `agent_binding` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `binding_uid` varchar(64) NOT NULL,
    `room_uid` varchar(64) NOT NULL,
    `kind` varchar(16) NOT NULL,
    `product_id` varchar(64) NOT NULL,
    `version` varchar(32) NOT NULL,
    `status` varchar(16) NOT NULL,
    `created_at` datetime NOT NULL,
    `deleted_at` datetime DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_agent_binding_uid` (`binding_uid`),
    KEY `idx_ab_room` (`room_uid`, `deleted_at`),
    KEY `idx_ab_product` (`product_id`, `deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `agent_task_run` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `task_uid` varchar(64) NOT NULL,
    `room_uid` varchar(64) NOT NULL,
    `tenant_id` varchar(64) NOT NULL,
    `status` varchar(16) NOT NULL,
    `prompt` longtext DEFAULT NULL,
    `plan_json` longtext DEFAULT NULL,
    `events_json` longtext DEFAULT NULL,
    `artifacts_json` longtext DEFAULT NULL,
    `failure_excerpt` text DEFAULT NULL,
    `created_at` datetime NOT NULL,
    `completed_at` datetime DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_agent_task_run_uid` (`task_uid`),
    KEY `idx_atr_room` (`room_uid`, `created_at`),
    KEY `idx_atr_tenant` (`tenant_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `agent_team_template` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `template_id` varchar(64) NOT NULL,
    `name` varchar(128) NOT NULL,
    `version` varchar(32) NOT NULL,
    `manager_profile_json` text NOT NULL,
    `workers_profile_json` text NOT NULL,
    `default_skills` text DEFAULT NULL,
    `default_mcps` text DEFAULT NULL,
    `created_at` datetime NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_agent_team_template_id` (`template_id`),
    KEY `idx_att_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `agent_team_template` (
    `template_id`,
    `name`,
    `version`,
    `manager_profile_json`,
    `workers_profile_json`,
    `default_skills`,
    `default_mcps`,
    `created_at`
) VALUES (
    'dev-team-v1',
    'Dev Team',
    '1.0.0',
    '{"role":"manager","model":"gpt-4o","systemPrompt":"You coordinate workers..."}',
    '[{"role":"coder","model":"gpt-4o","systemPrompt":"You write code..."},{"role":"reviewer","model":"gpt-4o","systemPrompt":"You review changes..."}]',
    '[]',
    '[]',
    NOW()
);
