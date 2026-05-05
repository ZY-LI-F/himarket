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
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.entity.KnowledgeAsset;
import com.alibaba.himarket.repository.KnowledgeAssetRepository;
import com.alibaba.himarket.validator.KnowledgePayloadValidator;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class KnowledgeServiceTest {

    private static final Clock FIXED_CLOCK =
            Clock.fixed(Instant.parse("2026-05-05T10:15:30Z"), ZoneOffset.UTC);

    private KnowledgeAssetRepository repository;
    private KnowledgeSyncService syncService;
    private KnowledgeService service;

    @BeforeEach
    void setUp() {
        repository = org.mockito.Mockito.mock(KnowledgeAssetRepository.class);
        syncService = org.mockito.Mockito.mock(KnowledgeSyncService.class);
        service =
                new KnowledgeService(
                        repository, new KnowledgePayloadValidator(), syncService, FIXED_CLOCK);
        when(repository.save(any(KnowledgeAsset.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void crudHappyPathAppliesSchemaScopeLockAndEtag() {
        KnowledgeService.Actor actor = KnowledgeService.Actor.developer("user-a", Set.of("team-a"));
        KnowledgeService.SaveCommand createCommand = teamCommand("title-required", "required");

        when(repository.findByScopeAndTeamIdAndUserIdAndNameAndCategory(
                        "team", "team-a", null, "title-required", "doc_review"))
                .thenReturn(Optional.empty());

        KnowledgeAsset created = service.create(actor, createCommand);

        assertTrue(created.getId().startsWith("knowledge-"));
        assertEquals("user-a", created.getOwnerId());
        assertEquals("team", created.getScope());
        assertEquals("team-a", created.getTeamId());
        assertNull(created.getUserId());
        assertEquals(1, created.getVersion());
        assertTrue(created.getSyncPending());
        assertNotNull(created.getEtag());
        String createEtag = created.getEtag();

        when(repository.findById(created.getId())).thenReturn(Optional.of(created));
        assertSame(created, service.get(actor, created.getId()));

        when(repository.findByIdForUpdate(created.getId())).thenReturn(Optional.of(created));
        when(repository.findByScopeAndTeamIdAndUserIdAndNameAndCategory(
                        "team", "team-a", null, "title-required", "doc_review"))
                .thenReturn(Optional.of(created));

        KnowledgeAsset updated =
                service.update(
                        actor,
                        created.getId(),
                        createEtag,
                        teamCommand("title-required", "updated"));

        assertEquals(2, updated.getVersion());
        assertEquals("updated", updated.getPayload().get("condition"));
        assertNotEquals(createEtag, updated.getEtag());
        assertNull(updated.getDeletedAt());
        String updateEtag = updated.getEtag();

        KnowledgeAsset deleted = service.delete(actor, updated.getId(), '"' + updateEtag + '"');

        assertFalse(deleted.getEnabled());
        assertNotNull(deleted.getDeletedAt());
        assertEquals(3, deleted.getVersion());
        assertNotEquals(updateEtag, deleted.getEtag());
        verify(repository, times(2)).findByIdForUpdate(created.getId());
        verify(syncService, times(3)).exportAsync(created.getId());
    }

    @Test
    void updateRejectsStaleEtagWithPreconditionFailed() {
        KnowledgeService.Actor actor = KnowledgeService.Actor.developer("user-a", Set.of("team-a"));
        KnowledgeAsset asset = existingTeamAsset("asset-001", "current-etag", "team-a");
        when(repository.findByIdForUpdate("asset-001")).thenReturn(Optional.of(asset));

        BusinessException error =
                assertThrows(
                        BusinessException.class,
                        () ->
                                service.update(
                                        actor,
                                        "asset-001",
                                        "stale-etag",
                                        teamCommand("title-required", "updated")));

        assertEquals(HttpStatus.PRECONDITION_FAILED, error.getStatus());
        assertEquals("PRECONDITION_FAILED", error.getCode());
        verify(repository, never()).save(any(KnowledgeAsset.class));
    }

    @Test
    void updateRejectsOutOfScopeActorWithForbidden() {
        KnowledgeService.Actor actor = KnowledgeService.Actor.developer("user-b", Set.of("team-b"));
        KnowledgeAsset asset = existingTeamAsset("asset-001", "current-etag", "team-a");
        when(repository.findByIdForUpdate("asset-001")).thenReturn(Optional.of(asset));

        BusinessException error =
                assertThrows(
                        BusinessException.class,
                        () ->
                                service.update(
                                        actor,
                                        "asset-001",
                                        "current-etag",
                                        teamCommand("title-required", "updated")));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        assertEquals("FORBIDDEN", error.getCode());
        verify(repository, never()).save(any(KnowledgeAsset.class));
    }

    private static KnowledgeAsset existingTeamAsset(String id, String etag, String teamId) {
        return KnowledgeAsset.builder()
                .id(id)
                .kind("DocReviewRule")
                .category("doc_review")
                .name("title-required")
                .scope("team")
                .teamId(teamId)
                .ownerId("user-a")
                .applicableWorkers(List.of("docclair", "hiclaw"))
                .severity("major")
                .domain("regulatory")
                .description("Title must be present.")
                .payload(payload("required"))
                .enabled(true)
                .version(1)
                .etag(etag)
                .syncPending(false)
                .build();
    }

    private static KnowledgeService.SaveCommand teamCommand(String name, String condition) {
        return new KnowledgeService.SaveCommand(
                "DocReviewRule",
                "doc_review",
                name,
                "team",
                "team-a",
                null,
                "baseline-title-required",
                List.of("docclair", "hiclaw"),
                "major",
                "regulatory",
                "Title must be present.",
                payload(condition),
                true);
    }

    private static Map<String, Object> payload(String condition) {
        return Map.of("key", "title", "condition", condition, "checks", List.of("presence"));
    }
}
