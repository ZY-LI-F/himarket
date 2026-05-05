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
import jakarta.persistence.Index;
import jakarta.persistence.Table;
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
        name = "writing_project",
        indexes = {
            @Index(name = "idx_writing_project_spec_version", columnList = "spec, version"),
            @Index(name = "idx_writing_project_status", columnList = "status")
        })
@Data
@EqualsAndHashCode(callSuper = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WritingProject extends BaseEntity {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "title", length = 255, nullable = false)
    private String title;

    @Column(name = "spec", length = 64, nullable = false)
    private String spec;

    @Column(name = "version", length = 64, nullable = false)
    private String version;

    @Column(name = "room_id", length = 128)
    private String roomId;

    @Column(name = "team_template_id", length = 128)
    private String teamTemplateId;

    @Column(name = "prompt", columnDefinition = "longtext")
    private String prompt;

    @Column(name = "status", length = 32, nullable = false)
    private String status;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "chapters", columnDefinition = "json", nullable = false)
    @Builder.Default
    private List<Map<String, Object>> chapters = List.of();

    @Column(name = "assembled_document", columnDefinition = "longtext")
    private String assembledDocument;

    @Column(name = "last_task_id", length = 128)
    private String lastTaskId;

    @Column(name = "last_dispatched_at", columnDefinition = "datetime(3)")
    private LocalDateTime lastDispatchedAt;
}
