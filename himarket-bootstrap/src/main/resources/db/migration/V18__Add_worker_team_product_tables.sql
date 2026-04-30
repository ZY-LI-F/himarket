CREATE TABLE IF NOT EXISTS `worker_team_product` (
    `product_id` varchar(64) NOT NULL,
    `name` varchar(128) NOT NULL,
    `version` varchar(64) NOT NULL,
    `business_domain` varchar(128) DEFAULT NULL,
    `description` varchar(1000) DEFAULT NULL,
    `status` varchar(32) NOT NULL,
    `visibility` varchar(32) NOT NULL,
    `pricing` json DEFAULT NULL,
    `tags_json` json DEFAULT NULL,
    `created_at` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`product_id`),
    KEY `idx_worker_team_product_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `worker_team_product_member` (
    `product_id` varchar(64) NOT NULL,
    `role` varchar(16) NOT NULL,
    `ref_name` varchar(128) NOT NULL,
    `ref_version` varchar(64) NOT NULL,
    `ordinal` int NOT NULL,
    PRIMARY KEY (`product_id`, `ordinal`),
    KEY `idx_worker_team_product_member_ref` (`ref_name`, `ref_version`),
    CONSTRAINT `fk_worker_team_product_member_product`
        FOREIGN KEY (`product_id`) REFERENCES `worker_team_product` (`product_id`)
        ON DELETE CASCADE,
    CONSTRAINT `chk_worker_team_product_member_role`
        CHECK (`role` IN ('leader', 'member', 'skill'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
