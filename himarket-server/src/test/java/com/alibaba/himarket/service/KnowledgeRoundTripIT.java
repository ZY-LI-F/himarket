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

package com.alibaba.himarket.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.alibaba.himarket.entity.KnowledgeAsset;
import com.alibaba.himarket.repository.KnowledgeAssetRepository;
import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

class KnowledgeRoundTripIT {

    private static final Clock FIXED_CLOCK =
            Clock.fixed(Instant.parse("2026-05-05T10:15:30Z"), ZoneOffset.UTC);
    private static final String DOCCLAIR_PREFIX = "teams/docclair/shared/knowledge/rules/";

    @Test
    void bootstrapMigrateKeepsDocclairRulesAndExportsNewKnowledgeYaml() throws Exception {
        InMemoryObjectStore objectStore = new InMemoryObjectStore();
        seedDocclairRules(objectStore);
        Map<String, KnowledgeAsset> assets = new LinkedHashMap<>();
        KnowledgeSyncService service =
                new KnowledgeSyncService(repositoryBackedBy(assets), objectStore, FIXED_CLOCK);

        int migrated = service.bootstrapMigrate();

        assertEquals(5, migrated);
        assertEquals(5, assets.size());
        assertTrue(
                objectStore.objects.containsKey("teams/docclair/shared/knowledge/.sync-pending"));

        KnowledgeAsset titleRule =
                assets.values().stream()
                        .filter(asset -> "title-style-consistency".equals(asset.getName()))
                        .findFirst()
                        .orElseThrow();
        assertEquals("DocReviewRule", titleRule.getKind());
        assertEquals("doc_review", titleRule.getCategory());
        assertEquals("team", titleRule.getScope());
        assertEquals("docclair", titleRule.getTeamId());
        assertEquals("medium", titleRule.getSeverity());
        assertEquals("structure", titleRule.getDomain());
        assertEquals("Keep title style consistent.", titleRule.getDescription());
        assertEquals(List.of("docclair"), titleRule.getApplicableWorkers());
        assertFalse(titleRule.getSyncPending());
        assertNotNull(titleRule.getLastSyncedAt());
        assertNotNull(titleRule.getEtag());

        String newKey = "teams/docclair/shared/knowledge/doc_review/" + titleRule.getId() + ".yaml";
        assertTrue(objectStore.objects.containsKey(newKey));
        assertTrue(
                objectStore.objects.containsKey(DOCCLAIR_PREFIX + "title-style-consistency.yaml"));
        assertRoundTripYaml(objectStore.objects.get(newKey));
    }

    @Test
    void retryPendingLeavesAssetPendingWhenExportFails() {
        InMemoryObjectStore objectStore = new InMemoryObjectStore();
        objectStore.failWrites = true;
        Map<String, KnowledgeAsset> assets = new LinkedHashMap<>();
        KnowledgeAsset asset = pendingAsset();
        assets.put(asset.getId(), asset);
        KnowledgeSyncService service =
                new KnowledgeSyncService(repositoryBackedBy(assets), objectStore, FIXED_CLOCK);

        assertThrows(IllegalStateException.class, service::retryPending);

        KnowledgeAsset failed = assets.get(asset.getId());
        assertTrue(failed.getSyncPending());
        assertNull(failed.getLastSyncedAt());
    }

    @SuppressWarnings("unchecked")
    private static void assertRoundTripYaml(String yamlText) {
        Map<String, Object> document = new Yaml().load(yamlText);
        Map<String, Object> metadata = (Map<String, Object>) document.get("metadata");
        Map<String, Object> spec = (Map<String, Object>) document.get("spec");

        assertEquals("hiclaw.io/v1beta1", document.get("apiVersion"));
        assertEquals("DocReviewRule", document.get("kind"));
        assertEquals("doc_review", document.get("category"));
        assertEquals("title-style-consistency", metadata.get("name"));
        assertEquals("team", metadata.get("scope"));
        assertEquals("docclair", metadata.get("team"));
        assertEquals("medium", metadata.get("severity"));
        assertEquals(Boolean.TRUE, metadata.get("enabled"));
        assertEquals("Keep title style consistent.", spec.get("description"));
        assertEquals("structure", spec.get("domain"));
        assertEquals("Use one heading style.", spec.get("fix_suggestion"));

        List<Map<String, Object>> detectors = (List<Map<String, Object>>) spec.get("detectors");
        assertEquals(1, detectors.size());
        assertEquals("keyword", detectors.get(0).get("type"));
        assertEquals(List.of("title"), detectors.get(0).get("keywords"));
        assertEquals(Boolean.FALSE, detectors.get(0).get("case_sensitive"));
    }

    private static KnowledgeAssetRepository repositoryBackedBy(Map<String, KnowledgeAsset> assets) {
        KnowledgeAssetRepository repository = mock(KnowledgeAssetRepository.class);
        when(repository.save(any(KnowledgeAsset.class)))
                .thenAnswer(
                        invocation -> {
                            KnowledgeAsset asset = invocation.getArgument(0);
                            assets.put(asset.getId(), asset);
                            return asset;
                        });
        when(repository.findById(anyString()))
                .thenAnswer(
                        invocation -> Optional.ofNullable(assets.get(invocation.getArgument(0))));
        when(repository.findBySyncPendingTrue())
                .thenAnswer(
                        invocation ->
                                assets.values().stream()
                                        .filter(
                                                asset ->
                                                        Boolean.TRUE.equals(asset.getSyncPending()))
                                        .toList());
        when(repository.findByScopeAndTeamIdAndUserIdAndNameAndCategory(
                        any(), any(), any(), any(), any()))
                .thenAnswer(
                        invocation -> {
                            String scope = invocation.getArgument(0);
                            String teamId = invocation.getArgument(1);
                            String userId = invocation.getArgument(2);
                            String name = invocation.getArgument(3);
                            String category = invocation.getArgument(4);
                            return assets.values().stream()
                                    .filter(
                                            asset ->
                                                    Objects.equals(asset.getScope(), scope)
                                                            && Objects.equals(
                                                                    asset.getTeamId(), teamId)
                                                            && Objects.equals(
                                                                    asset.getUserId(), userId)
                                                            && Objects.equals(asset.getName(), name)
                                                            && Objects.equals(
                                                                    asset.getCategory(), category))
                                    .findFirst();
                        });
        return repository;
    }

    private static void seedDocclairRules(InMemoryObjectStore objectStore) {
        objectStore.objects.put(
                DOCCLAIR_PREFIX + "title-style-consistency.yaml",
                legacyRule(
                        "title-style-consistency",
                        "medium",
                        "structure",
                        "title",
                        "Keep title style consistent.",
                        "Use one heading style."));
        objectStore.objects.put(
                DOCCLAIR_PREFIX + "deidentification-actionability.yaml",
                legacyRule(
                        "deidentification-actionability",
                        "blocker",
                        "compliance",
                        "privacy",
                        "Make deidentification actionable.",
                        "List fields, methods, owners, and checks."));
        objectStore.objects.put(
                DOCCLAIR_PREFIX + "inclusion-exclusion-criteria-completeness.yaml",
                legacyRule(
                        "inclusion-exclusion-criteria-completeness",
                        "high",
                        "methodology",
                        "criteria",
                        "Require both inclusion and exclusion criteria.",
                        "Add missing criteria with source and boundary."));
        objectStore.objects.put(
                DOCCLAIR_PREFIX + "section-numbering-consistency.yaml",
                legacyRule(
                        "section-numbering-consistency",
                        "high",
                        "consistency",
                        "numbering",
                        "Keep section numbering consistent.",
                        "Use one numbering hierarchy."));
        objectStore.objects.put(
                DOCCLAIR_PREFIX + "terminology-unification.yaml",
                legacyRule(
                        "terminology-unification",
                        "medium",
                        "terminology",
                        "term",
                        "Unify core terminology.",
                        "Create and follow a glossary."));
    }

    private static String legacyRule(
            String name,
            String severity,
            String domain,
            String keyword,
            String description,
            String fixSuggestion) {
        return """
        apiVersion: hiclaw.io/v1beta1
        kind: DocReviewRule
        metadata:
          name: %s
          team: docclair
          scope: team
          severity: %s
          enabled: true
        spec:
          description: %s
          domain: %s
          detectors:
            - type: keyword
              keywords:
                - %s
              case_sensitive: false
          fix_suggestion: %s
        """
                .formatted(name, severity, description, domain, keyword, fixSuggestion);
    }

    private static KnowledgeAsset pendingAsset() {
        KnowledgeAsset asset =
                KnowledgeAsset.builder()
                        .id("knowledge-pending")
                        .apiVersion("hiclaw.io/v1beta2")
                        .kind("DocReviewRule")
                        .category("doc_review")
                        .name("pending-rule")
                        .scope("team")
                        .teamId("docclair")
                        .ownerId("owner")
                        .severity("high")
                        .domain("structure")
                        .description("Pending rule")
                        .payload(Map.of("detectors", List.of(), "fix_suggestion", "Fix it."))
                        .enabled(true)
                        .version(1)
                        .etag("etag")
                        .syncPending(true)
                        .lastSyncedAt(LocalDateTime.parse("2026-05-05T09:00:00"))
                        .build();
        return asset;
    }

    private static final class InMemoryObjectStore implements KnowledgeObjectStore {

        private final Map<String, String> objects = new LinkedHashMap<>();
        private boolean failWrites;

        @Override
        public List<String> list(String prefix) {
            return objects.keySet().stream()
                    .filter(key -> key.startsWith(prefix))
                    .sorted()
                    .toList();
        }

        @Override
        public String readString(String key) throws IOException {
            String content = objects.get(key);
            if (content == null) {
                throw new IOException("missing object: " + key);
            }
            return content;
        }

        @Override
        public void writeString(String key, String content) throws IOException {
            if (failWrites) {
                throw new IOException("write failed: " + key);
            }
            objects.put(key, content);
        }
    }
}
