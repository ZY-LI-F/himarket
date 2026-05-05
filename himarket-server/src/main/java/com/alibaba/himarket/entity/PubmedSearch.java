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
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(
        name = "pubmed_search",
        indexes = {
            @Index(name = "idx_pubmed_search_user_created", columnList = "user_id, created_at")
        },
        uniqueConstraints = {
            @UniqueConstraint(
                    name = "uk_pubmed_search_query_hash",
                    columnNames = {"query_hash"})
        })
@Data
@EqualsAndHashCode(callSuper = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PubmedSearch extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", length = 64, nullable = false)
    private String userId;

    @Column(name = "query_hash", length = 64, nullable = false)
    private String queryHash;

    @Column(name = "query_text", columnDefinition = "text", nullable = false)
    private String queryText;

    @Column(name = "retmax", nullable = false)
    private Integer retmax;

    @Column(name = "total_count", nullable = false)
    private Long totalCount;

    @Column(name = "hit_count", nullable = false)
    private Long hitCount;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "pmids", columnDefinition = "json", nullable = false)
    private List<String> pmids;
}
