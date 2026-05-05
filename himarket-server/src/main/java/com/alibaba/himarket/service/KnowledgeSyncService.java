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

import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.exception.ErrorCode;
import com.alibaba.himarket.entity.KnowledgeAsset;
import com.alibaba.himarket.repository.KnowledgeAssetRepository;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;
import org.yaml.snakeyaml.DumperOptions;
import org.yaml.snakeyaml.Yaml;

@Service
@Slf4j
public class KnowledgeSyncService implements ApplicationRunner {

    private static final String API_VERSION = "hiclaw.io/v1beta2";
    private static final String DOC_REVIEW_CATEGORY = "doc_review";
    private static final String DOC_REVIEW_KIND = "DocReviewRule";
    private static final String DEFAULT_DOCCLAIR_TEAM = "docclair";
    private static final String BOOTSTRAP_OWNER = "system";
    private static final String OLD_DOCCLAIR_RULE_PREFIX = "teams/docclair/shared/knowledge/rules/";
    private static final String OLD_GLOBAL_RULE_PREFIX = "shared/knowledge/rules/";
    private static final Pattern SAFE_SEGMENT = Pattern.compile("[A-Za-z0-9._-]+");

    private final KnowledgeAssetRepository repository;
    private final KnowledgeObjectStore objectStore;
    private final Yaml yaml;
    private final Clock clock;

    public KnowledgeSyncService(
            KnowledgeAssetRepository repository, KnowledgeObjectStore objectStore) {
        this(repository, objectStore, Clock.systemDefaultZone());
    }

    KnowledgeSyncService(
            KnowledgeAssetRepository repository, KnowledgeObjectStore objectStore, Clock clock) {
        this.repository = Objects.requireNonNull(repository, "repository must not be null");
        this.objectStore = Objects.requireNonNull(objectStore, "objectStore must not be null");
        this.clock = Objects.requireNonNull(clock, "clock must not be null");
        DumperOptions options = new DumperOptions();
        options.setDefaultFlowStyle(DumperOptions.FlowStyle.BLOCK);
        options.setPrettyFlow(true);
        this.yaml = new Yaml(options);
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        int migrated = bootstrapMigrate();
        log.info("Knowledge bootstrap migration completed, migrated={} assets", migrated);
    }

    @Async("taskExecutor")
    public void exportAsync(String assetId) {
        exportNow(assetId);
    }

    public KnowledgeAsset exportNow(String assetId) {
        KnowledgeAsset asset =
                repository
                        .findById(requireText(assetId, "assetId"))
                        .orElseThrow(
                                () ->
                                        new BusinessException(
                                                ErrorCode.NOT_FOUND, "KnowledgeAsset", assetId));
        return exportAsset(asset);
    }

    public int retryPending() {
        List<KnowledgeAsset> pendingAssets = repository.findBySyncPendingTrue();
        List<RuntimeException> failures = new ArrayList<>();
        int synced = 0;
        for (KnowledgeAsset pendingAsset : pendingAssets) {
            try {
                exportAsset(pendingAsset);
                synced++;
            } catch (RuntimeException e) {
                failures.add(e);
            }
        }
        if (!failures.isEmpty()) {
            IllegalStateException aggregate =
                    new IllegalStateException(
                            "Failed to sync " + failures.size() + " knowledge assets");
            failures.forEach(aggregate::addSuppressed);
            throw aggregate;
        }
        return synced;
    }

    public int bootstrapMigrate() throws IOException {
        int migrated = 0;
        migrated +=
                importLegacyPrefix(
                        OLD_DOCCLAIR_RULE_PREFIX, ImportScope.team(DEFAULT_DOCCLAIR_TEAM));
        migrated += importLegacyPrefix(OLD_GLOBAL_RULE_PREFIX, ImportScope.global());
        return migrated;
    }

    public String renderYaml(KnowledgeAsset asset) {
        Objects.requireNonNull(asset, "asset must not be null");
        return yaml.dump(toYamlDocument(asset));
    }

    private int importLegacyPrefix(String prefix, ImportScope defaultScope) throws IOException {
        int migrated = 0;
        for (String key : objectStore.list(prefix)) {
            if (!isYamlKey(key)) {
                continue;
            }
            try {
                String content = objectStore.readString(key);
                KnowledgeAsset asset = importLegacyYaml(key, content, defaultScope);
                exportAsset(asset);
                migrated++;
            } catch (RuntimeException | IOException e) {
                throw new IllegalStateException(
                        "Failed to migrate legacy knowledge yaml: " + key, e);
            }
        }
        return migrated;
    }

    private KnowledgeAsset importLegacyYaml(String key, String content, ImportScope defaultScope) {
        Map<String, Object> document = loadYamlMap(content, key);
        Map<String, Object> metadata = optionalMap(document.get("metadata"));
        Map<String, Object> spec = optionalMap(document.get("spec"));

        String kind = optionalText(asString(document.get("kind")));
        if (kind == null) {
            kind = DOC_REVIEW_KIND;
        }
        String category =
                firstText(
                        document.get("category"),
                        metadata.get("category"),
                        DOC_REVIEW_KIND.equals(kind) ? DOC_REVIEW_CATEGORY : null);
        category = requireText(category, "category");
        String name = firstText(metadata.get("name"), fileBaseName(key));
        String scope = firstText(metadata.get("scope"), defaultScope.scope());
        String teamId = firstText(metadata.get("team"), defaultScope.teamId());
        String userId = firstText(metadata.get("user"), defaultScope.userId());
        validateScope(scope, teamId, userId, key);

        KnowledgeAsset asset =
                repository
                        .findByScopeAndTeamIdAndUserIdAndNameAndCategory(
                                scope, teamId, userId, name, category)
                        .orElseGet(KnowledgeAsset::new);
        if (asset.getId() == null) {
            asset.setId(stableAssetId(scope, teamId, userId, category, name));
            asset.setVersion(1);
        }
        asset.setApiVersion(
                firstText(document.get("apiVersion"), document.get("api_version"), API_VERSION));
        asset.setKind(kind);
        asset.setCategory(category);
        asset.setName(name);
        asset.setScope(scope);
        asset.setTeamId(teamId);
        asset.setUserId(userId);
        asset.setOwnerId(firstText(metadata.get("owner"), BOOTSTRAP_OWNER));
        asset.setInheritsFrom(
                firstText(document.get("inherits_from"), document.get("inheritsFrom")));
        asset.setApplicableWorkers(readApplicableWorkers(document, metadata, category));
        asset.setSeverity(optionalText(asString(metadata.get("severity"))));
        asset.setDomain(optionalText(asString(spec.get("domain"))));
        asset.setDescription(optionalText(asString(spec.get("description"))));
        asset.setPayload(payloadFromSpec(spec));
        asset.setEnabled(asBoolean(metadata.get("enabled")).orElse(true));
        asset.setDeletedAt(null);
        asset.setSyncPending(true);
        asset.setLastSyncedAt(null);
        asset.setEtag(sha256(content));
        return repository.save(asset);
    }

    private KnowledgeAsset exportAsset(KnowledgeAsset asset) {
        try {
            String rendered = renderYaml(asset);
            for (String key : exportKeys(asset)) {
                objectStore.writeString(key, rendered);
            }
            writeSyncPendingMarker(asset);
            asset.setEtag(sha256(rendered));
            asset.setSyncPending(false);
            asset.setLastSyncedAt(LocalDateTime.now(clock));
            return repository.save(asset);
        } catch (RuntimeException | IOException e) {
            markSyncPending(asset);
            throw new IllegalStateException(
                    "Failed to export knowledge asset: " + asset.getId(), e);
        }
    }

    private void markSyncPending(KnowledgeAsset asset) {
        asset.setSyncPending(true);
        asset.setLastSyncedAt(null);
        repository.save(asset);
        log.error("Knowledge sync failed; asset marked sync_pending=true: {}", asset.getId());
    }

    private void writeSyncPendingMarker(KnowledgeAsset asset) throws IOException {
        if (!"team".equals(normalizedScope(asset))) {
            return;
        }
        objectStore.writeString(
                "teams/"
                        + safeSegment(asset.getTeamId(), "teamId")
                        + "/shared/knowledge/.sync-pending",
                Instant.now(clock) + System.lineSeparator());
    }

    private List<String> exportKeys(KnowledgeAsset asset) {
        List<String> keys = new ArrayList<>();
        keys.add(primaryExportKey(asset));
        keys.addAll(legacyExportKeys(asset));
        return List.copyOf(keys);
    }

    private String primaryExportKey(KnowledgeAsset asset) {
        String category = safeSegment(asset.getCategory(), "category");
        String id = safeSegment(asset.getId(), "id");
        return switch (normalizedScope(asset)) {
            case "global" -> "shared/knowledge/" + category + "/" + id + ".yaml";
            case "team" ->
                    "teams/"
                            + safeSegment(asset.getTeamId(), "teamId")
                            + "/shared/knowledge/"
                            + category
                            + "/"
                            + id
                            + ".yaml";
            case "user" ->
                    "users/"
                            + safeSegment(asset.getUserId(), "userId")
                            + "/shared/knowledge/"
                            + category
                            + "/"
                            + id
                            + ".yaml";
            default -> throw invalid("Unsupported knowledge scope: " + asset.getScope());
        };
    }

    private List<String> legacyExportKeys(KnowledgeAsset asset) {
        if (!DOC_REVIEW_CATEGORY.equals(asset.getCategory())) {
            return List.of();
        }
        String name = safeSegment(asset.getName(), "name");
        return switch (normalizedScope(asset)) {
            case "global" -> List.of("shared/knowledge/rules/" + name + ".yaml");
            case "team" ->
                    List.of(
                            "teams/"
                                    + safeSegment(asset.getTeamId(), "teamId")
                                    + "/shared/knowledge/rules/"
                                    + name
                                    + ".yaml");
            default -> List.of();
        };
    }

    private Map<String, Object> toYamlDocument(KnowledgeAsset asset) {
        Map<String, Object> document = new LinkedHashMap<>();
        document.put("apiVersion", firstText(asset.getApiVersion(), API_VERSION));
        document.put("kind", requireText(asset.getKind(), "kind"));
        document.put("category", requireText(asset.getCategory(), "category"));

        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("name", requireText(asset.getName(), "name"));
        metadata.put("scope", normalizedScope(asset));
        if (asset.getTeamId() != null) {
            metadata.put("team", asset.getTeamId());
        }
        if (asset.getUserId() != null) {
            metadata.put("user", asset.getUserId());
        }
        if (asset.getSeverity() != null) {
            metadata.put("severity", asset.getSeverity());
        }
        metadata.put("enabled", Boolean.TRUE.equals(asset.getEnabled()));
        document.put("metadata", metadata);

        if (asset.getInheritsFrom() != null) {
            document.put("inherits_from", asset.getInheritsFrom());
        }
        if (asset.getApplicableWorkers() != null && !asset.getApplicableWorkers().isEmpty()) {
            document.put("applicable_workers", asset.getApplicableWorkers());
        }

        Map<String, Object> spec = new LinkedHashMap<>();
        if (asset.getDescription() != null) {
            spec.put("description", asset.getDescription());
        }
        if (asset.getDomain() != null) {
            spec.put("domain", asset.getDomain());
        }
        if (asset.getPayload() != null) {
            spec.putAll(asset.getPayload());
        }
        document.put("spec", spec);
        return document;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> loadYamlMap(String content, String source) {
        Object loaded = yaml.load(content);
        if (loaded instanceof Map<?, ?> map) {
            Map<String, Object> document = new LinkedHashMap<>();
            map.forEach((key, value) -> document.put(String.valueOf(key), value));
            return document;
        }
        throw new IllegalStateException("YAML root must be a map: " + source);
    }

    private Map<String, Object> optionalMap(Object value) {
        if (value == null) {
            return Map.of();
        }
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> result = new LinkedHashMap<>();
            map.forEach((key, mapValue) -> result.put(String.valueOf(key), mapValue));
            return result;
        }
        throw new IllegalStateException(
                "Expected YAML map, got: " + value.getClass().getSimpleName());
    }

    private Map<String, Object> payloadFromSpec(Map<String, Object> spec) {
        Map<String, Object> payload = new LinkedHashMap<>(spec);
        payload.remove("description");
        payload.remove("domain");
        if (payload.isEmpty()) {
            throw new IllegalStateException("Knowledge spec payload must not be empty");
        }
        return payload;
    }

    private List<String> readApplicableWorkers(
            Map<String, Object> document, Map<String, Object> metadata, String category) {
        Object value = document.get("applicable_workers");
        if (value == null) {
            value = document.get("applicableWorkers");
        }
        if (value == null) {
            value = metadata.get("applicable_workers");
        }
        if (value == null) {
            value = metadata.get("applicableWorkers");
        }
        if (value == null && DOC_REVIEW_CATEGORY.equals(category)) {
            return List.of("docclair");
        }
        if (value == null) {
            return null;
        }
        if (value instanceof List<?> list) {
            List<String> workers = new ArrayList<>(list.size());
            for (Object item : list) {
                workers.add(requireText(asString(item), "applicable_workers"));
            }
            return List.copyOf(workers);
        }
        throw new IllegalStateException("applicable_workers must be a YAML sequence");
    }

    private void validateScope(String scope, String teamId, String userId, String source) {
        switch (scope) {
            case "global" -> {
                if (teamId != null || userId != null) {
                    throw new IllegalStateException(
                            "global scope must not include owner ids: " + source);
                }
            }
            case "team" -> {
                if (teamId == null || userId != null) {
                    throw new IllegalStateException("team scope requires team only: " + source);
                }
            }
            case "user" -> {
                if (userId == null || teamId != null) {
                    throw new IllegalStateException("user scope requires user only: " + source);
                }
            }
            default ->
                    throw new IllegalStateException(
                            "Unsupported knowledge scope `" + scope + "` in " + source);
        }
    }

    private static boolean isYamlKey(String key) {
        String lower = key.toLowerCase(Locale.ROOT);
        return lower.endsWith(".yaml") || lower.endsWith(".yml");
    }

    private static String fileBaseName(String key) {
        int slash = key.lastIndexOf('/');
        String filename = slash >= 0 ? key.substring(slash + 1) : key;
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(0, dot) : filename;
    }

    private static String stableAssetId(
            String scope, String teamId, String userId, String category, String name) {
        String naturalKey =
                scope
                        + "|"
                        + Objects.toString(teamId, "")
                        + "|"
                        + Objects.toString(userId, "")
                        + "|"
                        + category
                        + "|"
                        + name;
        String suffix = safeSlug(name);
        String hash = sha256(naturalKey).substring(0, 16);
        String id = "knowledge-" + hash + "-" + suffix;
        return id.length() <= 64 ? id : id.substring(0, 64);
    }

    private static String safeSlug(String value) {
        String slug = value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9._-]+", "-");
        slug = slug.replaceAll("^-+|-+$", "");
        return slug.isBlank() ? "asset" : slug;
    }

    private static String safeSegment(String value, String field) {
        String segment = requireText(value, field);
        if (!SAFE_SEGMENT.matcher(segment).matches()) {
            throw invalid(field + " contains unsupported path characters: " + segment);
        }
        return segment;
    }

    private static String normalizedScope(KnowledgeAsset asset) {
        return requireText(asset.getScope(), "scope").toLowerCase(Locale.ROOT);
    }

    private static String firstText(Object... candidates) {
        for (Object candidate : candidates) {
            String value = optionalText(asString(candidate));
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private static String requireText(String value, String field) {
        String normalized = optionalText(value);
        if (normalized == null) {
            throw invalid(field + " must not be blank");
        }
        return normalized;
    }

    private static String optionalText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static Optional<Boolean> asBoolean(Object value) {
        if (value instanceof Boolean booleanValue) {
            return Optional.of(booleanValue);
        }
        if (value instanceof String stringValue && !stringValue.isBlank()) {
            return Optional.of(Boolean.parseBoolean(stringValue));
        }
        return Optional.empty();
    }

    private static BusinessException invalid(String message) {
        return new BusinessException(ErrorCode.INVALID_PARAMETER, message);
    }

    private static String sha256(String content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(content.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(bytes.length * 2);
            for (byte value : bytes) {
                builder.append(String.format(Locale.ROOT, "%02x", value));
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "SHA-256 digest is unavailable");
        }
    }

    private record ImportScope(String scope, String teamId, String userId) {

        static ImportScope global() {
            return new ImportScope("global", null, null);
        }

        static ImportScope team(String teamId) {
            return new ImportScope("team", teamId, null);
        }
    }
}

interface KnowledgeObjectStore {

    List<String> list(String prefix) throws IOException;

    String readString(String key) throws IOException;

    void writeString(String key, String content) throws IOException;
}

@Component
class FileSystemKnowledgeObjectStore implements KnowledgeObjectStore {

    private final Path root;

    FileSystemKnowledgeObjectStore(
            @Value(
                            "${himarket.knowledge.sync.storage-root:${user.home}/.himarket/knowledge-storage}")
                    String storageRoot) {
        String normalized = storageRoot == null ? "" : storageRoot.trim();
        if (normalized.isBlank()) {
            throw new IllegalArgumentException(
                    "himarket.knowledge.sync.storage-root must not be blank");
        }
        this.root = Path.of(normalized).toAbsolutePath().normalize();
    }

    @Override
    public List<String> list(String prefix) throws IOException {
        Path directory = resolveKey(prefix);
        if (!Files.exists(directory)) {
            return List.of();
        }
        if (!Files.isDirectory(directory)) {
            throw new IOException("Knowledge object prefix is not a directory: " + prefix);
        }
        try (var stream = Files.walk(directory)) {
            return stream.filter(Files::isRegularFile)
                    .map(root::relativize)
                    .map(path -> path.toString().replace('\\', '/'))
                    .sorted()
                    .toList();
        }
    }

    @Override
    public String readString(String key) throws IOException {
        return Files.readString(resolveKey(key), StandardCharsets.UTF_8);
    }

    @Override
    public void writeString(String key, String content) throws IOException {
        Path path = resolveKey(key);
        Files.createDirectories(path.getParent());
        Files.writeString(path, content, StandardCharsets.UTF_8);
    }

    private Path resolveKey(String key) throws IOException {
        String normalizedKey = key == null ? "" : key.replace('\\', '/');
        Path resolved = root.resolve(normalizedKey).normalize();
        if (!resolved.startsWith(root)) {
            throw new IOException("Knowledge object key escapes storage root: " + key);
        }
        return resolved;
    }
}
