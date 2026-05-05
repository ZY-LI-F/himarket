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
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "pubmed_record")
@Data
@EqualsAndHashCode(callSuper = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PubmedRecord extends BaseEntity {

    @Id
    @Column(name = "pmid", length = 32, nullable = false)
    private String pmid;

    @Column(name = "title", columnDefinition = "text")
    private String title;

    @Column(name = "journal", length = 512)
    private String journal;

    @Column(name = "pub_date", length = 128)
    private String pubDate;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "authors", columnDefinition = "json")
    private List<String> authors;

    @Column(name = "doi", length = 256)
    private String doi;

    @Column(name = "abstract_text", columnDefinition = "longtext")
    private String abstractText;
}
