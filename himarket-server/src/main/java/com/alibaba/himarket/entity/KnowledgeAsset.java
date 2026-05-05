/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package com.alibaba.himarket.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(
        name = "knowledge_asset",
        uniqueConstraints = {
            @UniqueConstraint(
                    columnNames = {"scope", "team_id", "user_id", "name", "category"},
                    name = "uk_scope_team_user_name_category")
        })
@Data
@EqualsAndHashCode(callSuper = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KnowledgeAsset extends BaseEntity {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "api_version", length = 64, nullable = false)
    @Builder.Default
    private String apiVersion = "hiclaw.io/v1beta2";

    @Column(name = "kind", length = 64, nullable = false)
    private String kind;

    @Column(name = "category", length = 64, nullable = false)
    private String category;

    @Column(name = "name", length = 128, nullable = false)
    private String name;

    @Column(name = "scope", length = 16, nullable = false)
    private String scope;

    @Column(name = "team_id", length = 64)
    private String teamId;

    @Column(name = "user_id", length = 64)
    private String userId;

    @Column(name = "owner_id", length = 64, nullable = false)
    private String ownerId;

    @Column(name = "inherits_from", length = 64)
    private String inheritsFrom;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "applicable_workers", columnDefinition = "json")
    private List<String> applicableWorkers;

    @Column(name = "severity", length = 16)
    private String severity;

    @Column(name = "domain", length = 64)
    private String domain;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", columnDefinition = "json", nullable = false)
    private Map<String, Object> payload;

    @Column(name = "enabled", nullable = false)
    @Builder.Default
    private Boolean enabled = true;

    @Column(name = "version", nullable = false)
    @Builder.Default
    private Integer version = 1;

    @Column(name = "etag", length = 64, nullable = false)
    private String etag;

    @Column(name = "sync_pending", nullable = false)
    @Builder.Default
    private Boolean syncPending = false;

    @Column(name = "last_synced_at", columnDefinition = "datetime(3)")
    private LocalDateTime lastSyncedAt;

    @Column(name = "deleted_at", columnDefinition = "datetime(3)")
    private LocalDateTime deletedAt;
}
