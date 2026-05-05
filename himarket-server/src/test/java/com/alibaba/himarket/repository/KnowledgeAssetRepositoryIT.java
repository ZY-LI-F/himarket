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

package com.alibaba.himarket.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.alibaba.himarket.entity.KnowledgeAsset;
import jakarta.persistence.EntityManager;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ContextConfiguration;

@DataJpaTest(
        properties = {
            "spring.datasource.url=jdbc:h2:mem:knowledge_asset_repository;MODE=MySQL;"
                    + "DATABASE_TO_LOWER=TRUE;CASE_INSENSITIVE_IDENTIFIERS=TRUE;DB_CLOSE_DELAY=-1",
            "spring.datasource.driver-class-name=org.h2.Driver",
            "spring.datasource.username=sa",
            "spring.jpa.hibernate.ddl-auto=create-drop"
        })
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ContextConfiguration(classes = KnowledgeAssetRepositoryIT.JpaTestApplication.class)
class KnowledgeAssetRepositoryIT {

    private final KnowledgeAssetRepository repository;
    private final EntityManager entityManager;

    @Autowired
    KnowledgeAssetRepositoryIT(KnowledgeAssetRepository repository, EntityManager entityManager) {
        this.repository = repository;
        this.entityManager = entityManager;
    }

    @Test
    void crudAndFindersRoundTripJsonFields() {
        KnowledgeAsset asset =
                KnowledgeAsset.builder()
                        .id("rule-001")
                        .kind("DocReviewRule")
                        .category("doc_review")
                        .name("title-required")
                        .scope("team")
                        .teamId("team-a")
                        .ownerId("owner-a")
                        .inheritsFrom("baseline-title-required")
                        .applicableWorkers(List.of("docclair", "hiclaw"))
                        .severity("major")
                        .domain("regulatory")
                        .description("Title must be present.")
                        .payload(payload("title", "required"))
                        .etag("sha256-create")
                        .build();

        repository.saveAndFlush(asset);
        entityManager.clear();

        KnowledgeAsset created = repository.findById("rule-001").orElseThrow();
        assertEquals("hiclaw.io/v1beta2", created.getApiVersion());
        assertEquals(List.of("docclair", "hiclaw"), created.getApplicableWorkers());
        assertEquals("required", created.getPayload().get("condition"));
        assertEquals(1, repository.findByScopeAndCategory("team", "doc_review").size());
        assertEquals(
                1,
                repository
                        .findByScopeAndCategoryAndEnabledTrueAndDeletedAtIsNull(
                                "team", "doc_review")
                        .size());
        assertTrue(
                repository
                        .findByScopeAndTeamIdAndUserIdAndNameAndCategory(
                                "team", "team-a", null, "title-required", "doc_review")
                        .isPresent());
        assertEquals(1, repository.findByOwnerIdAndEnabledTrueAndDeletedAtIsNull("owner-a").size());
        assertEquals(1, repository.findByInheritsFrom("baseline-title-required").size());
        assertTrue(repository.findByIdForUpdate("rule-001").isPresent());

        created.setVersion(2);
        created.setEtag("sha256-update");
        created.setSyncPending(true);
        created.setPayload(payload("title", "updated"));
        repository.saveAndFlush(created);
        entityManager.clear();

        KnowledgeAsset updated = repository.findById("rule-001").orElseThrow();
        assertEquals(2, updated.getVersion());
        assertEquals("sha256-update", updated.getEtag());
        assertEquals("updated", updated.getPayload().get("condition"));
        assertEquals(1, repository.findBySyncPendingTrue().size());

        repository.delete(updated);
        repository.flush();
        entityManager.clear();

        assertFalse(repository.findById("rule-001").isPresent());
    }

    private static Map<String, Object> payload(String key, String condition) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("key", key);
        payload.put("condition", condition);
        payload.put("checks", List.of("presence", "format"));
        return payload;
    }

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @EntityScan(basePackageClasses = KnowledgeAsset.class)
    @EnableJpaRepositories(
            basePackageClasses = KnowledgeAssetRepository.class,
            includeFilters =
                    @ComponentScan.Filter(
                            type = FilterType.ASSIGNABLE_TYPE,
                            classes = KnowledgeAssetRepository.class))
    static class JpaTestApplication {}
}
