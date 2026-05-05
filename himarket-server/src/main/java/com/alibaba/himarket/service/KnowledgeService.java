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

import cn.hutool.core.util.StrUtil;
import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.exception.ErrorCode;
import com.alibaba.himarket.core.utils.IdGenerator;
import com.alibaba.himarket.entity.KnowledgeAsset;
import com.alibaba.himarket.repository.KnowledgeAssetRepository;
import com.alibaba.himarket.validator.KnowledgePayloadValidator;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class KnowledgeService {

    private static final String RESOURCE_NAME = "KnowledgeAsset";
    private static final String ID_PREFIX = "knowledge-";
    private static final ObjectMapper ETAG_MAPPER =
            new ObjectMapper()
                    .configure(MapperFeature.SORT_PROPERTIES_ALPHABETICALLY, true)
                    .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);

    private final KnowledgeAssetRepository repository;
    private final KnowledgePayloadValidator payloadValidator;
    private final Clock clock;

    public KnowledgeService(
            KnowledgeAssetRepository repository, KnowledgePayloadValidator payloadValidator) {
        this(repository, payloadValidator, Clock.systemDefaultZone());
    }

    KnowledgeService(
            KnowledgeAssetRepository repository,
            KnowledgePayloadValidator payloadValidator,
            Clock clock) {
        this.repository = Objects.requireNonNull(repository, "repository must not be null");
        this.payloadValidator =
                Objects.requireNonNull(payloadValidator, "payloadValidator must not be null");
        this.clock = Objects.requireNonNull(clock, "clock must not be null");
    }

    public KnowledgeAsset create(Actor actor, SaveCommand command) {
        Objects.requireNonNull(actor, "actor must not be null");
        ValidatedCommand validated = validate(command);
        assertWriteAllowed(actor, validated.scope(), validated.teamId(), validated.userId());
        ensureUnique(null, validated);

        KnowledgeAsset asset =
                KnowledgeAsset.builder()
                        .id(IdGenerator.genIdWithPrefix(ID_PREFIX))
                        .kind(validated.kind())
                        .category(validated.category())
                        .name(validated.name())
                        .scope(validated.scope().value())
                        .teamId(validated.teamId())
                        .userId(validated.userId())
                        .ownerId(actor.userId())
                        .inheritsFrom(validated.inheritsFrom())
                        .applicableWorkers(validated.applicableWorkers())
                        .severity(validated.severity())
                        .domain(validated.domain())
                        .description(validated.description())
                        .payload(validated.payload())
                        .enabled(validated.enabled())
                        .version(1)
                        .syncPending(true)
                        .build();
        asset.setEtag(calculateEtag(asset));
        return repository.save(asset);
    }

    @Transactional(readOnly = true)
    public KnowledgeAsset get(Actor actor, String id) {
        Objects.requireNonNull(actor, "actor must not be null");
        KnowledgeAsset asset = findExisting(id);
        assertReadAllowed(actor, asset);
        return asset;
    }

    @Transactional(readOnly = true)
    public List<KnowledgeAsset> list(Actor actor, String scope, String category) {
        Objects.requireNonNull(actor, "actor must not be null");
        Scope parsedScope = Scope.parse(scope);
        String normalizedCategory = requireText(category, "category");
        return repository
                .findByScopeAndCategoryAndEnabledTrueAndDeletedAtIsNull(
                        parsedScope.value(), normalizedCategory)
                .stream()
                .filter(asset -> canRead(actor, asset))
                .toList();
    }

    public KnowledgeAsset update(Actor actor, String id, String ifMatchEtag, SaveCommand command) {
        Objects.requireNonNull(actor, "actor must not be null");
        KnowledgeAsset asset = findExistingForUpdate(id);
        assertWriteAllowed(actor, asset);
        assertEtagMatches(asset, ifMatchEtag);

        ValidatedCommand validated = validate(command);
        assertWriteAllowed(actor, validated.scope(), validated.teamId(), validated.userId());
        ensureUnique(asset.getId(), validated);

        asset.setKind(validated.kind());
        asset.setCategory(validated.category());
        asset.setName(validated.name());
        asset.setScope(validated.scope().value());
        asset.setTeamId(validated.teamId());
        asset.setUserId(validated.userId());
        asset.setInheritsFrom(validated.inheritsFrom());
        asset.setApplicableWorkers(validated.applicableWorkers());
        asset.setSeverity(validated.severity());
        asset.setDomain(validated.domain());
        asset.setDescription(validated.description());
        asset.setPayload(validated.payload());
        asset.setEnabled(validated.enabled());
        asset.setVersion(asset.getVersion() + 1);
        asset.setSyncPending(true);
        asset.setLastSyncedAt(null);
        asset.setEtag(calculateEtag(asset));
        return repository.save(asset);
    }

    public KnowledgeAsset delete(Actor actor, String id, String ifMatchEtag) {
        Objects.requireNonNull(actor, "actor must not be null");
        KnowledgeAsset asset = findExistingForUpdate(id);
        assertWriteAllowed(actor, asset);
        assertEtagMatches(asset, ifMatchEtag);

        asset.setEnabled(false);
        asset.setDeletedAt(LocalDateTime.now(clock));
        asset.setVersion(asset.getVersion() + 1);
        asset.setSyncPending(true);
        asset.setLastSyncedAt(null);
        asset.setEtag(calculateEtag(asset));
        return repository.save(asset);
    }

    private ValidatedCommand validate(SaveCommand command) {
        if (command == null) {
            throw invalid("command must not be null");
        }
        String kind = requireText(command.kind(), "kind");
        String category = requireText(command.category(), "category");
        String name = requireText(command.name(), "name");
        Scope scope = Scope.parse(command.scope());
        String teamId = optionalText(command.teamId());
        String userId = optionalText(command.userId());
        validateScopeShape(scope, teamId, userId);

        Map<String, Object> payload = requirePayload(command.payload());
        payloadValidator.validate(kind, category, payload);

        return new ValidatedCommand(
                kind,
                category,
                name,
                scope,
                teamId,
                userId,
                optionalText(command.inheritsFrom()),
                normalizeStringList(command.applicableWorkers(), "applicableWorkers"),
                optionalText(command.severity()),
                optionalText(command.domain()),
                optionalText(command.description()),
                payload,
                command.enabled() == null || command.enabled());
    }

    private static void validateScopeShape(Scope scope, String teamId, String userId) {
        switch (scope) {
            case GLOBAL -> {
                if (teamId != null || userId != null) {
                    throw invalid("global scope must not include teamId or userId");
                }
            }
            case TEAM -> {
                if (teamId == null || userId != null) {
                    throw invalid("team scope requires teamId and must not include userId");
                }
            }
            case USER -> {
                if (userId == null || teamId != null) {
                    throw invalid("user scope requires userId and must not include teamId");
                }
            }
        }
    }

    private void ensureUnique(String currentId, ValidatedCommand command) {
        Optional<KnowledgeAsset> duplicate =
                repository.findByScopeAndTeamIdAndUserIdAndNameAndCategory(
                        command.scope().value(),
                        command.teamId(),
                        command.userId(),
                        command.name(),
                        command.category());
        duplicate.ifPresent(
                asset -> {
                    if (!asset.getId().equals(currentId) && asset.getDeletedAt() == null) {
                        throw new BusinessException(
                                ErrorCode.CONFLICT,
                                "knowledge asset already exists: " + command.name());
                    }
                });
    }

    private KnowledgeAsset findExisting(String id) {
        String normalizedId = requireText(id, "id");
        KnowledgeAsset asset =
                repository
                        .findById(normalizedId)
                        .orElseThrow(
                                () ->
                                        new BusinessException(
                                                ErrorCode.NOT_FOUND, RESOURCE_NAME, normalizedId));
        if (asset.getDeletedAt() != null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, RESOURCE_NAME, normalizedId);
        }
        return asset;
    }

    private KnowledgeAsset findExistingForUpdate(String id) {
        String normalizedId = requireText(id, "id");
        KnowledgeAsset asset =
                repository
                        .findByIdForUpdate(normalizedId)
                        .orElseThrow(
                                () ->
                                        new BusinessException(
                                                ErrorCode.NOT_FOUND, RESOURCE_NAME, normalizedId));
        if (asset.getDeletedAt() != null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, RESOURCE_NAME, normalizedId);
        }
        return asset;
    }

    private static void assertEtagMatches(KnowledgeAsset asset, String ifMatchEtag) {
        String expected = normalizeEtag(ifMatchEtag);
        if (expected == null) {
            throw new KnowledgeAccessException(
                    HttpStatus.PRECONDITION_FAILED,
                    "PRECONDITION_FAILED",
                    "If-Match etag is required");
        }
        if (!expected.equals(asset.getEtag())) {
            throw new KnowledgeAccessException(
                    HttpStatus.PRECONDITION_FAILED,
                    "PRECONDITION_FAILED",
                    "Knowledge asset etag does not match");
        }
    }

    private static void assertReadAllowed(Actor actor, KnowledgeAsset asset) {
        if (!canRead(actor, asset)) {
            throw forbidden("Knowledge asset is outside readable scope");
        }
    }

    private static void assertWriteAllowed(Actor actor, KnowledgeAsset asset) {
        assertWriteAllowed(
                actor,
                Scope.parse(asset.getScope()),
                optionalText(asset.getTeamId()),
                optionalText(asset.getUserId()));
    }

    private static void assertWriteAllowed(Actor actor, Scope scope, String teamId, String userId) {
        if (!canWrite(actor, scope, teamId, userId)) {
            throw forbidden("Knowledge asset is outside writable scope");
        }
    }

    private static boolean canRead(Actor actor, KnowledgeAsset asset) {
        Scope scope = Scope.parse(asset.getScope());
        return canRead(
                actor, scope, optionalText(asset.getTeamId()), optionalText(asset.getUserId()));
    }

    private static boolean canRead(Actor actor, Scope scope, String teamId, String userId) {
        if (actor.administrator()) {
            return true;
        }
        return switch (scope) {
            case GLOBAL -> true;
            case TEAM -> teamId != null && actor.teamIds().contains(teamId);
            case USER -> userId != null && userId.equals(actor.userId());
        };
    }

    private static boolean canWrite(Actor actor, Scope scope, String teamId, String userId) {
        if (actor.administrator()) {
            return true;
        }
        return switch (scope) {
            case GLOBAL -> false;
            case TEAM -> teamId != null && actor.teamIds().contains(teamId);
            case USER -> userId != null && userId.equals(actor.userId());
        };
    }

    private String calculateEtag(KnowledgeAsset asset) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("id", asset.getId());
        snapshot.put("kind", asset.getKind());
        snapshot.put("category", asset.getCategory());
        snapshot.put("name", asset.getName());
        snapshot.put("scope", asset.getScope());
        snapshot.put("teamId", asset.getTeamId());
        snapshot.put("userId", asset.getUserId());
        snapshot.put("ownerId", asset.getOwnerId());
        snapshot.put("inheritsFrom", asset.getInheritsFrom());
        snapshot.put("applicableWorkers", asset.getApplicableWorkers());
        snapshot.put("severity", asset.getSeverity());
        snapshot.put("domain", asset.getDomain());
        snapshot.put("description", asset.getDescription());
        snapshot.put("payload", asset.getPayload());
        snapshot.put("enabled", asset.getEnabled());
        snapshot.put("version", asset.getVersion());
        snapshot.put(
                "deletedAt", asset.getDeletedAt() == null ? null : asset.getDeletedAt().toString());
        try {
            byte[] bytes = ETAG_MAPPER.writeValueAsBytes(snapshot);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return toHex(digest.digest(bytes));
        } catch (JsonProcessingException e) {
            throw new BusinessException(
                    ErrorCode.INVALID_PARAMETER, "payload is not JSON serializable");
        } catch (NoSuchAlgorithmException e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "SHA-256 digest is unavailable");
        }
    }

    private static String toHex(byte[] bytes) {
        StringBuilder builder = new StringBuilder(bytes.length * 2);
        for (byte value : bytes) {
            builder.append(String.format(Locale.ROOT, "%02x", value));
        }
        return builder.toString();
    }

    private static String requireText(String value, String field) {
        String normalized = optionalText(value);
        if (normalized == null) {
            throw invalid(field + " must not be blank");
        }
        return normalized;
    }

    private static String optionalText(String value) {
        if (StrUtil.isBlank(value)) {
            return null;
        }
        return value.trim();
    }

    private static String normalizeEtag(String value) {
        String normalized = optionalText(value);
        if (normalized != null
                && normalized.length() >= 2
                && normalized.startsWith("\"")
                && normalized.endsWith("\"")) {
            return normalized.substring(1, normalized.length() - 1);
        }
        return normalized;
    }

    private static Map<String, Object> requirePayload(Map<String, Object> payload) {
        if (payload == null || payload.isEmpty()) {
            throw invalid("payload must not be empty");
        }
        return new LinkedHashMap<>(payload);
    }

    private static List<String> normalizeStringList(List<String> values, String field) {
        if (values == null) {
            return null;
        }
        List<String> normalized = new ArrayList<>(values.size());
        for (String value : values) {
            String text = optionalText(value);
            if (text == null) {
                throw invalid(field + " must contain only non-empty strings");
            }
            normalized.add(text);
        }
        return List.copyOf(normalized);
    }

    private static Set<String> normalizeStringSet(Set<String> values, String field) {
        if (values == null) {
            return Set.of();
        }
        return values.stream()
                .map(
                        value -> {
                            String text = optionalText(value);
                            if (text == null) {
                                throw invalid(field + " must contain only non-empty strings");
                            }
                            return text;
                        })
                .collect(Collectors.toUnmodifiableSet());
    }

    private static BusinessException invalid(String message) {
        return new BusinessException(ErrorCode.INVALID_PARAMETER, message);
    }

    private static KnowledgeAccessException forbidden(String message) {
        return new KnowledgeAccessException(HttpStatus.FORBIDDEN, "FORBIDDEN", message);
    }

    public record Actor(String userId, boolean administrator, Set<String> teamIds) {

        public Actor {
            String normalizedUserId = requireText(userId, "actor.userId");
            userId = normalizedUserId;
            teamIds = normalizeStringSet(teamIds, "actor.teamIds");
        }

        public static Actor administrator(String userId) {
            return new Actor(userId, true, Set.of());
        }

        public static Actor developer(String userId, Set<String> teamIds) {
            return new Actor(userId, false, teamIds);
        }
    }

    public record SaveCommand(
            String kind,
            String category,
            String name,
            String scope,
            String teamId,
            String userId,
            String inheritsFrom,
            List<String> applicableWorkers,
            String severity,
            String domain,
            String description,
            Map<String, Object> payload,
            Boolean enabled) {

        public SaveCommand {
            applicableWorkers = applicableWorkers == null ? null : List.copyOf(applicableWorkers);
            payload = payload == null ? null : Map.copyOf(payload);
        }
    }

    private record ValidatedCommand(
            String kind,
            String category,
            String name,
            Scope scope,
            String teamId,
            String userId,
            String inheritsFrom,
            List<String> applicableWorkers,
            String severity,
            String domain,
            String description,
            Map<String, Object> payload,
            Boolean enabled) {}

    private enum Scope {
        GLOBAL("global"),
        TEAM("team"),
        USER("user");

        private final String value;

        Scope(String value) {
            this.value = value;
        }

        String value() {
            return value;
        }

        static Scope parse(String value) {
            String normalized = requireText(value, "scope").toLowerCase(Locale.ROOT);
            for (Scope scope : values()) {
                if (scope.value.equals(normalized)) {
                    return scope;
                }
            }
            throw invalid("scope must be one of: global, team, user");
        }
    }

    public static class KnowledgeAccessException extends BusinessException {

        private final HttpStatus status;
        private final String code;
        private final String message;

        private KnowledgeAccessException(HttpStatus status, String code, String message) {
            super(ErrorCode.INVALID_REQUEST, message);
            this.status = status;
            this.code = code;
            this.message = message;
        }

        @Override
        public HttpStatus getStatus() {
            return status;
        }

        @Override
        public String getCode() {
            return code;
        }

        @Override
        public String getMessage() {
            return message;
        }
    }
}
