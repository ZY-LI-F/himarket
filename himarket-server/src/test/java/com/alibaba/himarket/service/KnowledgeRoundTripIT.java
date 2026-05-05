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

import com.alibaba.himarket.api.v1.admin.knowledge.KnowledgeController;
import com.alibaba.himarket.core.security.ContextHolder;
import com.alibaba.himarket.entity.KnowledgeAsset;
import com.alibaba.himarket.repository.KnowledgeAssetRepository;
import com.alibaba.himarket.validator.KnowledgePayloadValidator;
import java.io.IOException;
import java.net.URISyntaxException;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.yaml.snakeyaml.Yaml;

class KnowledgeRoundTripIT {

    private static final Clock FIXED_CLOCK =
            Clock.fixed(Instant.parse("2026-05-05T10:15:30Z"), ZoneOffset.UTC);
    private static final String DOCCLAIR_PREFIX = "teams/docclair/shared/knowledge/rules/";
    private static final String DOCCLAIR_FIXTURE_DIR = "fixtures/docclair-rules";
    private static final Yaml YAML = new Yaml();

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void docclairLegacyFixturesRoundTripThroughImportRestCrudAndExport() throws Exception {
        InMemoryObjectStore objectStore = new InMemoryObjectStore();
        Map<String, String> fixtures = seedDocclairRules(objectStore);
        Map<String, KnowledgeAsset> assets = new LinkedHashMap<>();
        KnowledgeAssetRepository repository = repositoryBackedBy(assets);
        KnowledgeSyncService service =
                new KnowledgeSyncService(repository, objectStore, FIXED_CLOCK);
        KnowledgeController controller = controller(repository, service);
        authenticate("admin-a", "ROLE_ADMIN");

        int migrated = service.bootstrapMigrate();

        assertEquals(5, migrated);
        assertEquals(5, fixtures.size());
        assertEquals(5, assets.size());
        assertTrue(
                objectStore.objects.containsKey("teams/docclair/shared/knowledge/.sync-pending"));

        for (Map.Entry<String, String> fixture : fixtures.entrySet()) {
            Map<String, Object> expectedDocument =
                    normalizedLegacyDocument(fixture.getKey(), fixture.getValue());
            KnowledgeAsset imported = assetByName(assets, fileBaseName(fixture.getKey()));

            assertImportedAssetEqualsExpected(imported, expectedDocument);
            assertExportedYamlEqualsExpected(
                    objectStore, imported, fixture.getKey(), expectedDocument);

            KnowledgeAsset fetched = controller.get(imported.getId());
            assertEquals(imported.getId(), fetched.getId());
            assertEquals(imported.getEtag(), fetched.getEtag());
        }

        List<KnowledgeAsset> importedRules = controller.list("team", "doc_review");
        assertEquals(5, importedRules.size());

        KnowledgeAsset created =
                controller.create(restRequest("rest-crud-probe", "Initial REST condition", true));
        assertEquals(created.getId(), controller.get(created.getId()).getId());
        assertRestExport(objectStore, created, "Initial REST condition", true);

        KnowledgeAsset updated =
                controller.update(
                        created.getId(),
                        '"' + created.getEtag() + '"',
                        restRequest("rest-crud-probe", "Updated REST condition", true));
        assertEquals(2, updated.getVersion());
        assertRestExport(objectStore, updated, "Updated REST condition", true);

        KnowledgeAsset deleted = controller.delete(updated.getId(), updated.getEtag());
        assertFalse(deleted.getEnabled());
        assertNotNull(deleted.getDeletedAt());
        assertRestExport(objectStore, deleted, "Updated REST condition", false);
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
        when(repository.findByIdForUpdate(anyString()))
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
        when(repository.findByScopeAndCategoryAndEnabledTrueAndDeletedAtIsNull(
                        anyString(), anyString()))
                .thenAnswer(
                        invocation -> {
                            String scope = invocation.getArgument(0);
                            String category = invocation.getArgument(1);
                            return assets.values().stream()
                                    .filter(
                                            asset ->
                                                    Objects.equals(asset.getScope(), scope)
                                                            && Objects.equals(
                                                                    asset.getCategory(), category)
                                                            && Boolean.TRUE.equals(
                                                                    asset.getEnabled())
                                                            && asset.getDeletedAt() == null)
                                    .toList();
                        });
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

    private static Map<String, String> seedDocclairRules(InMemoryObjectStore objectStore)
            throws IOException, URISyntaxException {
        Map<String, String> fixtures = loadDocclairFixtures();
        fixtures.forEach(
                (filename, content) ->
                        objectStore.objects.put(DOCCLAIR_PREFIX + filename, content));
        return fixtures;
    }

    private static Map<String, String> loadDocclairFixtures()
            throws IOException, URISyntaxException {
        URL resource =
                KnowledgeRoundTripIT.class.getClassLoader().getResource(DOCCLAIR_FIXTURE_DIR);
        assertNotNull(resource);
        try (Stream<Path> paths = Files.list(Path.of(resource.toURI()))) {
            List<Path> yamlFiles =
                    paths.filter(Files::isRegularFile)
                            .filter(KnowledgeRoundTripIT::isYamlPath)
                            .sorted(Comparator.comparing(path -> path.getFileName().toString()))
                            .toList();
            assertEquals(5, yamlFiles.size());

            Map<String, String> fixtures = new LinkedHashMap<>();
            for (Path yamlFile : yamlFiles) {
                fixtures.put(yamlFile.getFileName().toString(), Files.readString(yamlFile));
            }
            return fixtures;
        }
    }

    private static boolean isYamlPath(Path path) {
        String filename = path.getFileName().toString();
        return filename.endsWith(".yaml") || filename.endsWith(".yml");
    }

    private static KnowledgeController controller(
            KnowledgeAssetRepository repository, KnowledgeSyncService syncService) {
        KnowledgePayloadValidator validator = new KnowledgePayloadValidator();
        KnowledgeService service =
                new KnowledgeService(repository, validator, syncService, FIXED_CLOCK);
        return new KnowledgeController(service, validator, new ContextHolder());
    }

    private static void authenticate(String userId, String role) {
        SecurityContextHolder.getContext()
                .setAuthentication(
                        new UsernamePasswordAuthenticationToken(
                                userId, null, List.of(new SimpleGrantedAuthority(role))));
    }

    private static KnowledgeController.SaveRequest restRequest(
            String name, String condition, boolean enabled) {
        return new KnowledgeController.SaveRequest(
                "DocReviewRule",
                "doc_review",
                name,
                "team",
                "docclair",
                null,
                null,
                List.of("docclair"),
                "major",
                "rest-crud",
                "REST CRUD condition probe.",
                Map.of("key", name, "condition", condition, "checks", List.of("presence")),
                enabled);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> normalizedLegacyDocument(String filename, String yamlText) {
        Map<String, Object> original = loadYamlMap(yamlText);
        Map<String, Object> originalMetadata = mapValue(original.get("metadata"));
        Map<String, Object> originalSpec = mapValue(original.get("spec"));

        Map<String, Object> expected = new LinkedHashMap<>();
        expected.put("apiVersion", firstText(original.get("apiVersion"), "hiclaw.io/v1beta2"));
        expected.put("kind", firstText(original.get("kind"), "DocReviewRule"));
        expected.put(
                "category",
                firstText(
                        original.get("category"), originalMetadata.get("category"), "doc_review"));

        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("name", firstText(originalMetadata.get("name"), fileBaseName(filename)));
        metadata.put("scope", firstText(originalMetadata.get("scope"), "team"));
        metadata.put("team", firstText(originalMetadata.get("team"), "docclair"));
        if (originalMetadata.containsKey("severity")) {
            metadata.put("severity", originalMetadata.get("severity"));
        }
        metadata.put(
                "enabled",
                originalMetadata.containsKey("enabled")
                        ? originalMetadata.get("enabled")
                        : Boolean.TRUE);
        expected.put("metadata", metadata);

        String inheritsFrom =
                firstText(original.get("inherits_from"), original.get("inheritsFrom"));
        if (inheritsFrom != null) {
            expected.put("inherits_from", inheritsFrom);
        }
        expected.put("applicable_workers", applicableWorkers(original, originalMetadata));
        expected.put("spec", normalizedSpec(originalSpec));
        return expected;
    }

    private static Object applicableWorkers(
            Map<String, Object> document, Map<String, Object> metadata) {
        Object workers = document.get("applicable_workers");
        if (workers == null) {
            workers = document.get("applicableWorkers");
        }
        if (workers == null) {
            workers = metadata.get("applicable_workers");
        }
        if (workers == null) {
            workers = metadata.get("applicableWorkers");
        }
        return workers == null ? List.of("docclair") : workers;
    }

    private static Map<String, Object> normalizedSpec(Map<String, Object> originalSpec) {
        Map<String, Object> spec = new LinkedHashMap<>();
        if (originalSpec.containsKey("description")) {
            spec.put("description", originalSpec.get("description"));
        }
        if (originalSpec.containsKey("domain")) {
            spec.put("domain", originalSpec.get("domain"));
        }
        originalSpec.forEach(
                (key, value) -> {
                    if (!"description".equals(key) && !"domain".equals(key)) {
                        spec.put(key, value);
                    }
                });
        return spec;
    }

    private static void assertImportedAssetEqualsExpected(
            KnowledgeAsset asset, Map<String, Object> expectedDocument) {
        Map<String, Object> metadata = mapValue(expectedDocument.get("metadata"));
        Map<String, Object> spec = mapValue(expectedDocument.get("spec"));
        Map<String, Object> expectedPayload = new LinkedHashMap<>(spec);
        expectedPayload.remove("description");
        expectedPayload.remove("domain");

        assertEquals(expectedDocument.get("apiVersion"), asset.getApiVersion());
        assertEquals(expectedDocument.get("kind"), asset.getKind());
        assertEquals(expectedDocument.get("category"), asset.getCategory());
        assertEquals(metadata.get("name"), asset.getName());
        assertEquals(metadata.get("scope"), asset.getScope());
        assertEquals(metadata.get("team"), asset.getTeamId());
        assertEquals(metadata.get("severity"), asset.getSeverity());
        assertEquals(metadata.get("enabled"), asset.getEnabled());
        assertEquals(expectedDocument.get("applicable_workers"), asset.getApplicableWorkers());
        assertEquals(spec.get("description"), asset.getDescription());
        assertEquals(spec.get("domain"), asset.getDomain());
        assertEquals(expectedPayload, asset.getPayload());
        assertFalse(asset.getSyncPending());
        assertNotNull(asset.getLastSyncedAt());
        assertNotNull(asset.getEtag());
    }

    private static void assertExportedYamlEqualsExpected(
            InMemoryObjectStore objectStore,
            KnowledgeAsset asset,
            String fixtureName,
            Map<String, Object> expectedDocument) {
        String primaryKey = "teams/docclair/shared/knowledge/doc_review/" + asset.getId() + ".yaml";
        String legacyKey = DOCCLAIR_PREFIX + fixtureName;

        assertTrue(objectStore.objects.containsKey(primaryKey));
        assertTrue(objectStore.objects.containsKey(legacyKey));
        assertEquals(expectedDocument, loadYamlMap(objectStore.objects.get(primaryKey)));
        assertEquals(expectedDocument, loadYamlMap(objectStore.objects.get(legacyKey)));
    }

    private static void assertRestExport(
            InMemoryObjectStore objectStore,
            KnowledgeAsset asset,
            String condition,
            boolean enabled) {
        String primaryKey = "teams/docclair/shared/knowledge/doc_review/" + asset.getId() + ".yaml";
        Map<String, Object> exported = loadYamlMap(objectStore.objects.get(primaryKey));
        Map<String, Object> metadata = mapValue(exported.get("metadata"));
        Map<String, Object> spec = mapValue(exported.get("spec"));

        assertEquals("hiclaw.io/v1beta2", exported.get("apiVersion"));
        assertEquals("DocReviewRule", exported.get("kind"));
        assertEquals("doc_review", exported.get("category"));
        assertEquals(asset.getName(), metadata.get("name"));
        assertEquals("team", metadata.get("scope"));
        assertEquals("docclair", metadata.get("team"));
        assertEquals(enabled, metadata.get("enabled"));
        assertEquals("rest-crud", spec.get("domain"));
        assertEquals("REST CRUD condition probe.", spec.get("description"));
        assertEquals(asset.getName(), spec.get("key"));
        assertEquals(condition, spec.get("condition"));
        assertEquals(List.of("presence"), spec.get("checks"));
    }

    private static KnowledgeAsset assetByName(Map<String, KnowledgeAsset> assets, String name) {
        return assets.values().stream()
                .filter(asset -> name.equals(asset.getName()))
                .findFirst()
                .orElseThrow();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> loadYamlMap(String yamlText) {
        Object loaded = YAML.load(yamlText);
        assertTrue(loaded instanceof Map<?, ?>);
        Map<String, Object> document = new LinkedHashMap<>();
        ((Map<?, ?>) loaded).forEach((key, value) -> document.put(String.valueOf(key), value));
        return document;
    }

    private static Map<String, Object> mapValue(Object value) {
        assertTrue(value instanceof Map<?, ?>);
        Map<String, Object> result = new LinkedHashMap<>();
        ((Map<?, ?>) value).forEach((key, mapValue) -> result.put(String.valueOf(key), mapValue));
        return result;
    }

    private static String firstText(Object... candidates) {
        for (Object candidate : candidates) {
            String value = optionalText(candidate);
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private static String optionalText(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }

    private static String fileBaseName(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(0, dot) : filename;
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
