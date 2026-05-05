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

package com.alibaba.himarket.api.v1.admin.knowledge;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.security.ContextHolder;
import com.alibaba.himarket.entity.KnowledgeAsset;
import com.alibaba.himarket.repository.KnowledgeAssetRepository;
import com.alibaba.himarket.service.KnowledgeService;
import com.alibaba.himarket.validator.KnowledgePayloadValidator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

class KnowledgeControllerTest {

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void preAuthorizeAllowsAdminOrDeveloperOnly() {
        PreAuthorize preAuthorize = KnowledgeController.class.getAnnotation(PreAuthorize.class);

        assertNotNull(preAuthorize);
        assertEquals("hasRole('ADMIN') or hasRole('DEVELOPER')", preAuthorize.value());
    }

    @Test
    @SuppressWarnings("unchecked")
    void schemaEndpointReturnsDocReviewRjsfSchema() {
        KnowledgeController controller = controller(mock(KnowledgeService.class));

        KnowledgeController.RjsfSchemaResponse response =
                controller.getSchema("DocReviewRule", "doc_review");

        assertEquals("doc_review", response.category());
        assertEquals("DocReviewRule", response.kind());
        Map<String, Object> properties = (Map<String, Object>) response.schema().get("properties");
        assertTrue(properties.containsKey("payload"));
        Map<String, Object> payloadSchema = (Map<String, Object>) properties.get("payload");
        assertEquals(List.of("key", "condition", "checks"), payloadSchema.get("required"));
        assertEquals(false, payloadSchema.get("additionalProperties"));
    }

    @Test
    void validateEndpointRejectsInvalidDocReviewPayload() {
        KnowledgeController controller = controller(mock(KnowledgeService.class));

        BusinessException error =
                assertThrows(
                        BusinessException.class,
                        () ->
                                controller.validate(
                                        new KnowledgeController.ValidationRequest(
                                                "DocReviewRule",
                                                "doc_review",
                                                Map.of("key", "title", "condition", "required"))));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
    }

    @Test
    void validateEndpointAcceptsValidDocReviewPayload() {
        KnowledgeController controller = controller(mock(KnowledgeService.class));

        KnowledgeController.ValidationResponse response =
                controller.validate(
                        new KnowledgeController.ValidationRequest(
                                "DocReviewRule", "doc_review", payload("required")));

        assertTrue(response.valid());
    }

    @Test
    void updateRejectsStaleEtagWithPreconditionFailed() {
        authenticate("admin-a", "ROLE_ADMIN");
        KnowledgeAssetRepository repository = repository();
        KnowledgeAsset existing = existingGlobalAsset("asset-001", "current-etag");
        when(repository.findByIdForUpdate("asset-001")).thenReturn(Optional.of(existing));
        KnowledgeController controller =
                controller(new KnowledgeService(repository, new KnowledgePayloadValidator()));

        BusinessException error =
                assertThrows(
                        BusinessException.class,
                        () ->
                                controller.update(
                                        "asset-001",
                                        "stale-etag",
                                        globalRequest("title-required", "updated")));

        assertEquals(HttpStatus.PRECONDITION_FAILED, error.getStatus());
        assertEquals("PRECONDITION_FAILED", error.getCode());
    }

    @Test
    void scopeRulesReturnForbiddenAndAllowedCreates() {
        authenticate("user-a", "ROLE_DEVELOPER");
        KnowledgeAssetRepository repository = repository();
        when(repository.findByScopeAndTeamIdAndUserIdAndNameAndCategory(
                        "user", null, "user-a", "title-required", "doc_review"))
                .thenReturn(Optional.empty());
        KnowledgeController controller =
                controller(new KnowledgeService(repository, new KnowledgePayloadValidator()));

        BusinessException forbidden =
                assertThrows(
                        BusinessException.class,
                        () ->
                                controller.create(
                                        globalRequest("global-title-required", "required")));
        assertEquals(HttpStatus.FORBIDDEN, forbidden.getStatus());

        KnowledgeAsset created =
                controller.create(userRequest("user-a", "title-required", "required"));

        assertEquals("user", created.getScope());
        assertEquals("user-a", created.getUserId());
        assertTrue(created.getSyncPending());
    }

    @Test
    void createPersistsKnowledgeAssetThroughService() {
        authenticate("admin-a", "ROLE_ADMIN");
        KnowledgeAssetRepository repository = repository();
        when(repository.findByScopeAndTeamIdAndUserIdAndNameAndCategory(
                        "global", null, null, "title-required", "doc_review"))
                .thenReturn(Optional.empty());
        KnowledgeController controller =
                controller(new KnowledgeService(repository, new KnowledgePayloadValidator()));

        KnowledgeAsset created = controller.create(globalRequest("title-required", "required"));

        assertTrue(created.getId().startsWith("knowledge-"));
        assertEquals("admin-a", created.getOwnerId());
        assertEquals("global", created.getScope());
        assertTrue(created.getSyncPending());
        assertNotNull(created.getEtag());
    }

    private static KnowledgeController controller(KnowledgeService service) {
        return new KnowledgeController(
                service, new KnowledgePayloadValidator(), new ContextHolder());
    }

    private static KnowledgeAssetRepository repository() {
        KnowledgeAssetRepository repository = mock(KnowledgeAssetRepository.class);
        when(repository.save(any(KnowledgeAsset.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        return repository;
    }

    private static void authenticate(String userId, String role) {
        SecurityContextHolder.getContext()
                .setAuthentication(
                        new UsernamePasswordAuthenticationToken(
                                userId, null, List.of(new SimpleGrantedAuthority(role))));
    }

    private static KnowledgeAsset existingGlobalAsset(String id, String etag) {
        return KnowledgeAsset.builder()
                .id(id)
                .kind("DocReviewRule")
                .category("doc_review")
                .name("title-required")
                .scope("global")
                .ownerId("admin-a")
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

    private static KnowledgeController.SaveRequest userRequest(
            String userId, String name, String condition) {
        return new KnowledgeController.SaveRequest(
                "DocReviewRule",
                "doc_review",
                name,
                "user",
                null,
                userId,
                "baseline-title-required",
                List.of("docclair", "hiclaw"),
                "major",
                "regulatory",
                "Title must be present.",
                payload(condition),
                true);
    }

    private static KnowledgeController.SaveRequest globalRequest(String name, String condition) {
        return new KnowledgeController.SaveRequest(
                "DocReviewRule",
                "doc_review",
                name,
                "global",
                null,
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
